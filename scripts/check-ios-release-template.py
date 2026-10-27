#!/usr/bin/env python3
"""Check paid-signing patch compatibility with the actual generated iOS project.

Runs on the macOS verification job after native bootstrap. Uses fixture public
identifiers only; never changes the generated project or signs/builds an app.
"""
import importlib.util
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    project = ROOT / 'mobile/ios/Runner.xcodeproj/project.pbxproj'
    if not project.is_file():
        print('Generate the native Flutter iOS project before the template check.', file=sys.stderr)
        return 1
    if not shutil.which('plutil'):
        print('The macOS plutil tool is required for this compatibility check.', file=sys.stderr)
        return 1
    original = project.read_bytes()
    spec = importlib.util.spec_from_file_location('ilmigo_paid_ios', ROOT / 'scripts/build-paid-ios.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    fixture = {
        'ILMIGO_IOS_TEAM_ID': 'A1B2C3D4E5',
        'ILMIGO_IOS_BUNDLE_ID': 'com.ilmigo.ci.fixture',
        'ILMIGO_IOS_PROFILE_NAME': 'ILMIGO CI template fixture',
        'ILMIGO_IOS_SIGNING_IDENTITY': 'Apple Distribution: ILMIGO CI fixture (A1B2C3D4E5)',
    }
    try:
        patched = module._runner_signing(original.decode('utf8'), fixture)
        if patched.encode('utf8') == original:
            raise ValueError('The signing patch did not change the generated fixture.')
        with tempfile.TemporaryDirectory(prefix='ilmigo-ios-template-') as temporary:
            candidate = Path(temporary) / 'project.pbxproj'
            candidate.write_text(patched)
            subprocess.run(['plutil', '-lint', str(candidate)], check=True)
        if project.read_bytes() != original:
            raise ValueError('The generated source project changed during a read-only check.')
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f'iOS release template compatibility failed ({type(error).__name__}).', file=sys.stderr)
        return 1
    print('Actual generated Flutter iOS project accepts the Runner-only signing patch and passes plutil; source unchanged. No app signing or IPA build was attempted.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
