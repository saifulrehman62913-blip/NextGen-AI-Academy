#!/usr/bin/env python3
"""Export a manually signed paid iOS IPA using an owner's installed signing identity.

Never imports keys, installs provisioning profiles, logs in or uploads to Apple.
Run after bootstrap/tests on the owner's trusted macOS build host.
"""
import datetime
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def validate(env):
    issues = []
    try:
        uri = urlsplit(env.get('API_BASE_URL', ''))
        if (uri.scheme != 'https' or not uri.hostname or uri.username or uri.password
                or uri.query or uri.fragment or uri.path not in ('', '/') or uri.port not in (None, 443)):
            raise ValueError()
    except ValueError:
        issues.append('API_BASE_URL must be an HTTPS origin on port 443.')
    key = env.get('REVENUECAT_IOS_KEY', '')
    if not key.startswith('appl_') or len(key) < 12:
        issues.append('REVENUECAT_IOS_KEY must be the Apple public SDK key, not a server secret or test-store key.')
    if not re.fullmatch(r'[A-Z0-9]{10}', env.get('ILMIGO_IOS_TEAM_ID', '')):
        issues.append('ILMIGO_IOS_TEAM_ID must be the 10-character owner team identifier.')
    if not re.fullmatch(r'[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+){2,}', env.get('ILMIGO_IOS_BUNDLE_ID', '')):
        issues.append('ILMIGO_IOS_BUNDLE_ID must be the registered application bundle identifier.')
    for field in ('ILMIGO_IOS_SIGNING_IDENTITY', 'ILMIGO_IOS_PROFILE_NAME'):
        if not env.get(field, '').strip() or '\n' in env[field] or '\r' in env[field]:
            issues.append(f'{field} is required and must be a single line.')
    if env.get('ILMIGO_RELEASE_ACCEPTANCE') != 'verified':
        issues.append('ILMIGO_RELEASE_ACCEPTANCE=verified is required after owner staging, content/privacy and device acceptance.')
    source = Path(env.get('ILMIGO_IOS_EXPORT_OPTIONS', ''))
    try:
        options = plistlib.loads(source.read_bytes())
        expected = {env.get('ILMIGO_IOS_BUNDLE_ID'): env.get('ILMIGO_IOS_PROFILE_NAME')}
        if (not isinstance(options, dict) or options.get('method') not in ('app-store', 'app-store-connect')
                or options.get('teamID') != env.get('ILMIGO_IOS_TEAM_ID')
                or options.get('signingStyle') != 'manual'
                or options.get('provisioningProfiles') != expected
                or options.get('destination', 'export') != 'export'
                or options.get('uploadSymbols', False) is not False
                or options.get('manageAppVersionAndBuildNumber', False) is not False
                or options.get('signingCertificate', env.get('ILMIGO_IOS_SIGNING_IDENTITY')) != env.get('ILMIGO_IOS_SIGNING_IDENTITY')):
            raise ValueError()
    except (OSError, ValueError, plistlib.InvalidFileException, TypeError):
        issues.append('ILMIGO_IOS_EXPORT_OPTIONS must be a manual App Store export plist matching the owner team, bundle, profile and signing identity; uploads/version management must be disabled.')
    profile = Path(env.get('ILMIGO_IOS_PROVISIONING_PROFILE', ''))
    if not profile.is_file():
        issues.append('ILMIGO_IOS_PROVISIONING_PROFILE must reference the installed owner distribution profile file.')
    return issues


def _run(runner, args, env, cwd, capture=False):
    return runner(args, env=env, cwd=cwd, check=True,
                  **({'capture_output': True} if capture else {}))


def _profile(env, runner, cwd):
    result = _run(runner, ['security', 'cms', '-D', '-i', env['ILMIGO_IOS_PROVISIONING_PROFILE']], env, cwd, True)
    profile = plistlib.loads(result.stdout)
    if not isinstance(profile, dict) or not isinstance(profile.get('Entitlements'), dict):
        raise ValueError('The provisioning profile structure is invalid.')
    expiry = profile.get('ExpirationDate')
    if isinstance(expiry, datetime.datetime) and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=datetime.timezone.utc)
    if (profile.get('Name') != env['ILMIGO_IOS_PROFILE_NAME']
            or profile.get('TeamIdentifier') != [env['ILMIGO_IOS_TEAM_ID']]
            or profile.get('Entitlements', {}).get('application-identifier') != f"{env['ILMIGO_IOS_TEAM_ID']}.{env['ILMIGO_IOS_BUNDLE_ID']}"
            or profile.get('Entitlements', {}).get('get-task-allow', False) is not False
            or profile.get('ProvisionsAllDevices', False) is not False
            or 'ProvisionedDevices' in profile
            or not isinstance(expiry, datetime.datetime)
            or expiry <= datetime.datetime.now(datetime.timezone.utc)):
        raise ValueError('The owner profile must be an unexpired, exact-bundle App Store distribution profile.')
    identities = _run(runner, ['security', 'find-identity', '-v', '-p', 'codesigning'], env, cwd, True).stdout.decode('utf8', 'replace')
    matches = re.findall(r'\b([0-9A-Fa-f]{40})\s+"([^"]+)"', identities)
    desired = env['ILMIGO_IOS_SIGNING_IDENTITY']
    if not any((desired.upper() == fingerprint.upper() or desired == name)
               and name.startswith(('Apple Distribution:', 'iPhone Distribution:')) for fingerprint, name in matches):
        raise ValueError('The selected owner distribution certificate and private key must be installed and usable in the build keychain.')


def _verify_app(app, env, runner, cwd):
    with (app / 'Info.plist').open('rb') as handle:
        info = plistlib.load(handle)
    if info.get('CFBundleIdentifier') != env['ILMIGO_IOS_BUNDLE_ID']:
        raise ValueError('The signed application bundle identifier does not match this release.')
    _run(runner, ['codesign', '--verify', '--deep', '--strict', str(app)], env, cwd, True)
    display = _run(runner, ['codesign', '--display', '--verbose=4', str(app)], env, cwd, True)
    details = (display.stdout + display.stderr).decode('utf8', 'replace')
    if f"TeamIdentifier={env['ILMIGO_IOS_TEAM_ID']}\n" not in details or not re.search(r'^Authority=(Apple|iPhone) Distribution:', details, re.M):
        raise ValueError('The application must have an owner-team distribution signature, not simulator/ad-hoc signing.')


def _block_end(text, opening):
    """Match an OpenStep dictionary while ignoring quoted strings/comments."""
    depth = 0
    index = opening
    while index < len(text):
        char = text[index]
        if char == '"':
            index += 1
            while index < len(text):
                if text[index] == '\\':
                    index += 2
                elif text[index] == '"':
                    index += 1
                    break
                else:
                    index += 1
            continue
        if text.startswith('/*', index):
            end = text.find('*/', index + 2)
            if end < 0:
                raise ValueError('Invalid Xcode project comment.')
            index = end + 2
            continue
        if text.startswith('//', index):
            end = text.find('\n', index + 2)
            index = len(text) if end < 0 else end + 1
            continue
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return index
        index += 1
    raise ValueError('Unbalanced Xcode project dictionary.')


def _project_object(text, identifier):
    matches = list(re.finditer(r'(?m)^\s*' + re.escape(identifier) + r'\s*/\*[^\n]*?\*/\s*=\s*\{', text))
    if len(matches) != 1:
        raise ValueError('Expected one Xcode project object.')
    start = text.index('{', matches[0].start())
    end = _block_end(text, start)
    return start, end, text[start + 1:end]


def _runner_signing(text, env):
    """Change only Runner's Release buildSettings, never Pods/project settings."""
    targets = []
    for match in re.finditer(r'(?m)^\s*([A-Fa-f0-9]{24})\s*/\* Runner \*/\s*=\s*\{', text):
        start = text.index('{', match.start())
        body = text[start + 1:_block_end(text, start)]
        if re.search(r'\bisa\s*=\s*PBXNativeTarget\s*;', body) and re.search(r'\bname\s*=\s*Runner\s*;', body):
            targets.append(body)
    if len(targets) != 1:
        raise ValueError('Expected exactly one Runner application target.')
    config_list = re.search(r'\bbuildConfigurationList\s*=\s*([A-Fa-f0-9]{24})\b', targets[0])
    if not config_list:
        raise ValueError('Runner configuration list is missing.')
    _, _, configs = _project_object(text, config_list[1])
    references = re.search(r'\bbuildConfigurations\s*=\s*\((.*?)\);', configs, re.S)
    if not references:
        raise ValueError('Runner build configurations are missing.')
    releases = []
    for identifier in re.findall(r'\b([A-Fa-f0-9]{24})\b', references[1]):
        start, end, body = _project_object(text, identifier)
        if re.search(r'\bname\s*=\s*Release\s*;', body):
            releases.append((start, end, body))
    if len(releases) != 1:
        raise ValueError('Expected one Runner Release configuration.')
    start, _, body = releases[0]
    settings = re.search(r'\bbuildSettings\s*=\s*\{', body)
    if not settings:
        raise ValueError('Runner Release settings are missing.')
    opening = start + 1 + body.index('{', settings.start())
    closing = _block_end(text, opening)
    contents = text[opening + 1:closing]
    names = ('CODE_SIGN_STYLE', 'DEVELOPMENT_TEAM', 'CODE_SIGN_IDENTITY', 'PRODUCT_BUNDLE_IDENTIFIER',
             'PROVISIONING_PROFILE_SPECIFIER', 'PROVISIONING_PROFILE', 'CODE_SIGNING_ALLOWED', 'CODE_SIGNING_REQUIRED')
    # Delete existing plain/conditional signing assignments in this one target.
    keys = '|'.join(names)
    assignment = r'(?m)^[ \t]*(?:"(?:' + keys + r')(?:\[[^"\n]*\])?"|(?:' + keys + r'))[ \t]*=[ \t]*(?:"(?:\\.|[^"\\])*"|[^;\n]*);[ \t]*\n?'
    contents = re.sub(assignment, '', contents)
    values = dict(CODE_SIGN_STYLE='Manual', DEVELOPMENT_TEAM=env['ILMIGO_IOS_TEAM_ID'],
                  CODE_SIGN_IDENTITY=env['ILMIGO_IOS_SIGNING_IDENTITY'],
                  PRODUCT_BUNDLE_IDENTIFIER=env['ILMIGO_IOS_BUNDLE_ID'],
                  PROVISIONING_PROFILE_SPECIFIER=env['ILMIGO_IOS_PROFILE_NAME'],
                  CODE_SIGNING_ALLOWED='YES', CODE_SIGNING_REQUIRED='YES')
    contents += '\n' + ''.join('\t\t\t\t' + key + ' = ' + json.dumps(value, ensure_ascii=False) + ';\n' for key, value in values.items())
    return text[:opening + 1] + contents + text[closing:]


def build(root=ROOT, env=None, runner=subprocess.run, host=sys.platform, which=shutil.which):
    env = dict(os.environ if env is None else env)
    root = Path(root).resolve()
    issues = validate(env)
    if host != 'darwin':
        issues.append('Paid iOS export requires a macOS build host with Xcode.')
    for tool in ('flutter', 'xcodebuild', 'security', 'codesign'):
        if not which(tool):
            issues.append(f'{tool} must be installed and available on the trusted build host.')
    mobile = root / 'mobile'
    project = mobile / 'ios/Runner.xcodeproj/project.pbxproj'
    if not (mobile / 'ios/Runner.xcworkspace').is_dir() or not project.is_file():
        issues.append('Run bootstrap_mobile.py first; the native iOS workspace is missing.')
    if issues:
        for issue in issues:
            print(issue, file=sys.stderr)
        return 1
    env['ILMIGO_IOS_PROVISIONING_PROFILE'] = str(Path(env['ILMIGO_IOS_PROVISIONING_PROFILE']).resolve())
    asset = mobile / 'assets/catalog.json'
    original = None
    original_project = None
    output_started = False
    output = mobile / 'build/ios/ilmigo-paid/ILMIGO.ipa'
    try:
        # Profile/certificate checks run before assets or a previous release are touched.
        _profile(env, runner, mobile)
        original = asset.read_bytes()
        original_project = project.read_bytes()
        # Validate target scoping before compilation or output replacement.
        _runner_signing(original_project.decode('utf8'), env)
        catalog = json.loads(original)
        catalog['lessons'] = []
        defines = {'API_BASE_URL': env['API_BASE_URL'].rstrip('/'), 'REVENUECAT_IOS_KEY': env['REVENUECAT_IOS_KEY'],
                   'ENABLE_PURCHASES': True, 'SUBSCRIPTIONS_REQUIRED': True}
        options = plistlib.loads(Path(env['ILMIGO_IOS_EXPORT_OPTIONS']).read_bytes())
        options.update(destination='export', uploadSymbols=False, manageAppVersionAndBuildNumber=False,
                       signingCertificate=env['ILMIGO_IOS_SIGNING_IDENTITY'])
        output.parent.mkdir(parents=True, exist_ok=True)
        output.unlink(missing_ok=True)
        output_started = True
        with tempfile.TemporaryDirectory(prefix='ilmigo-paid-ios-') as temporary:
            temp = Path(temporary)
            config = temp / 'public-defines.json'
            config.write_text(json.dumps(defines))
            export = temp / 'ExportOptions.plist'
            export.write_bytes(plistlib.dumps(options))
            archive = temp / 'ILMIGO.xcarchive'
            destination = temp / 'export'
            asset.write_text(json.dumps(catalog, ensure_ascii=False) + '\n')
            # No-codesign is configuration only. Success here cannot produce a release.
            _run(runner, ['flutter', 'build', 'ios', '--release', '--config-only', '--no-codesign',
                          f'--dart-define-from-file={config}'], env, mobile)
            project.write_text(_runner_signing(project.read_text(), env))
            _run(runner, ['xcodebuild', '-workspace', 'ios/Runner.xcworkspace', '-scheme', 'Runner',
                          '-configuration', 'Release', '-sdk', 'iphoneos', '-destination', 'generic/platform=iOS',
                          '-archivePath', str(archive), 'archive'], env, mobile)
            _verify_app(archive / 'Products/Applications/Runner.app', env, runner, mobile)
            _run(runner, ['xcodebuild', '-exportArchive', '-archivePath', str(archive),
                          '-exportPath', str(destination), '-exportOptionsPlist', str(export)], env, mobile)
            ipas = list(destination.glob('*.ipa'))
            if len(ipas) != 1:
                raise ValueError('Export did not create exactly one fresh IPA.')
            with zipfile.ZipFile(ipas[0]) as package:
                for member in package.infolist():
                    parts = Path(member.filename).parts
                    if member.filename.startswith('/') or '..' in parts:
                        raise ValueError('Exported IPA contains an invalid archive path.')
                package.extractall(temp / 'verify')
            apps = list((temp / 'verify/Payload').glob('*.app'))
            if len(apps) != 1:
                raise ValueError('Exported IPA does not contain exactly one app.')
            _verify_app(apps[0], env, runner, mobile)
            if (apps[0] / 'embedded.mobileprovision').read_bytes() != Path(env['ILMIGO_IOS_PROVISIONING_PROFILE']).read_bytes():
                raise ValueError('Exported IPA did not use the expected owner provisioning profile.')
            shutil.copyfile(ipas[0], output)
    except (subprocess.CalledProcessError, OSError, ValueError, TypeError, plistlib.InvalidFileException, zipfile.BadZipFile):
        if output_started:
            output.unlink(missing_ok=True)
        print('Paid iOS export failed. No successful signed IPA is claimed; inspect local compiler/signing diagnostics.', file=sys.stderr)
        return 1
    finally:
        if original is not None:
            asset.write_bytes(original)
        if original_project is not None:
            project.write_bytes(original_project)
    print('Owner distribution IPA exported and signature checked. App Store upload, review and live transactions were not performed.')
    return 0


if __name__ == '__main__':
    sys.exit(build())
