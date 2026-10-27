#!/usr/bin/env python3
"""CI negative check: a release without an owner keystore must fail explicitly."""
from pathlib import Path
import os,subprocess
root=Path(__file__).resolve().parents[1]
env=dict(os.environ)
for name in ['ILMIGO_ANDROID_KEYSTORE','ILMIGO_ANDROID_STORE_PASSWORD','ILMIGO_ANDROID_KEY_ALIAS','ILMIGO_ANDROID_KEY_PASSWORD']:
    env.pop(name,None)
result=subprocess.run(['./gradlew',':app:validateSigningRelease','--console=plain'],cwd=root/'mobile/android',env=env,capture_output=True,text=True,timeout=180)
if result.returncode==0 or 'ILMIGO release signing requires owner credentials' not in result.stdout+result.stderr:
    raise SystemExit('Release signing guard did not fail for the expected missing-owner-credential reason. Check Gradle configuration.')
print('Release signing guard passed: missing owner credentials cannot fall back to a debug-signed release.')
