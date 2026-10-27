#!/usr/bin/env python3
"""Build an owner-signed paid AAB; no provider secrets belong in Dart defines."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit
from release_signing import FIELDS, MARKER

ROOT=Path(__file__).resolve().parents[1]

def validate(env):
    issues=[]
    try:
        uri=urlsplit(env.get('API_BASE_URL',''))
        if uri.scheme!='https' or not uri.hostname or uri.username or uri.password or uri.query or uri.fragment or uri.path not in ('','/'):
            raise ValueError()
        if uri.port not in (None,443):raise ValueError()
    except ValueError:issues.append('API_BASE_URL must be an HTTPS origin on port 443.')
    key=env.get('REVENUECAT_ANDROID_KEY','')
    if not key.startswith('goog_') or len(key)<12:issues.append('REVENUECAT_ANDROID_KEY must be the Android public SDK key, not a server secret or test-store key.')
    for field in FIELDS:
        if not env.get(field,'').strip():issues.append(f'{field} is required.')
    if env.get(FIELDS[0]) and not Path(env[FIELDS[0]]).is_file():issues.append('The owner keystore file does not exist.')
    if env.get('ILMIGO_RELEASE_ACCEPTANCE')!='verified':issues.append('ILMIGO_RELEASE_ACCEPTANCE=verified is required after owner staging, content/privacy and device acceptance.')
    return issues

def build(root=ROOT,env=None,runner=subprocess.run):
    env=dict(os.environ if env is None else env)
    issues=validate(env)
    gradle=root/'mobile/android/app/build.gradle.kts'
    if not gradle.is_file() or MARKER not in gradle.read_text() or 'signingConfigs.getByName("debug")' in gradle.read_text():issues.append('Run bootstrap_mobile.py first; owner-only release signing is required.')
    if issues:
        for issue in issues:print(issue,file=sys.stderr)
        return 1
    # Resolve before Gradle interprets it relative to mobile/android/app.
    env[FIELDS[0]]=str(Path(env[FIELDS[0]]).resolve())
    asset=root/'mobile/assets/catalog.json'
    original=asset.read_bytes()
    catalog=json.loads(original);catalog['lessons']=[]
    # Only public client configuration is written to the temporary file.
    defines={'API_BASE_URL':env['API_BASE_URL'].rstrip('/'),'REVENUECAT_ANDROID_KEY':env['REVENUECAT_ANDROID_KEY'],'ENABLE_PURCHASES':True,'SUBSCRIPTIONS_REQUIRED':True}
    output=root/'mobile/build/app/outputs/bundle/release/app-release.aab'
    try:
        output.unlink(missing_ok=True)
        with tempfile.TemporaryDirectory(prefix='ilmigo-paid-') as tmp:
            config=Path(tmp)/'public-defines.json';config.write_text(json.dumps(defines))
            asset.write_text(json.dumps(catalog,ensure_ascii=False)+'\n')
            runner(['flutter','build','appbundle','--release',f'--dart-define-from-file={config}'],cwd=root/'mobile',env=env,check=True)
    except (subprocess.CalledProcessError,OSError):
        print('Paid Android build failed. Check the compiler/signing output; no successful release is claimed.',file=sys.stderr)
        return 1
    finally:
        asset.write_bytes(original)
    if not output.is_file():
        print('Build returned without the expected AAB.',file=sys.stderr);return 1
    print('Owner-signed paid AAB built. Store upload, live transactions and payout are not performed by this command.')
    return 0

if __name__=='__main__':sys.exit(build())
