#!/usr/bin/env python3
"""Generate native platform shells using the installed Flutter SDK, then patch permissions."""
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from release_signing import configure_release
root=Path(__file__).resolve().parents[1]
mobile=root/'mobile'
if not shutil.which('flutter'):
    sys.exit('Flutter SDK is missing. Install Flutter stable, add flutter/bin to PATH, and rerun this script.')
subprocess.run(['flutter','create','--no-pub','--empty','--org','com.ilmigo','--project-name','ilmigo','--platforms','android,ios','.'],cwd=mobile,check=True)
gradle=mobile/'android/app/build.gradle.kts'
gradle.write_text(configure_release(gradle.read_text()))
generated_test=mobile/'test/widget_test.dart'
if generated_test.exists() and 'MyApp' in generated_test.read_text():
    generated_test.unlink()
ns='http://schemas.android.com/apk/res/android'
ET.register_namespace('android',ns)
manifest=mobile/'android/app/src/main/AndroidManifest.xml'
tree=ET.parse(manifest)
r=tree.getroot()
for name in ['android.permission.INTERNET','android.permission.RECORD_AUDIO','android.permission.BLUETOOTH','android.permission.BLUETOOTH_ADMIN','android.permission.BLUETOOTH_CONNECT']:
    if not any(x.get('{'+ns+'}name')==name for x in r.findall('uses-permission')):
        ET.SubElement(r,'uses-permission',{'{'+ns+'}name':name})
application=r.find('application')
application.set('{'+ns+'}label','ILMIGO DIGITAL ACADEMY')
queries=r.find('queries')
if queries is None:queries=ET.SubElement(r,'queries')
for action in ['android.speech.RecognitionService','android.intent.action.TTS_SERVICE']:
    if not any(a.get('{'+ns+'}name')==action for a in queries.findall('./intent/action')):
        intent=ET.SubElement(queries,'intent')
        ET.SubElement(intent,'action',{'{'+ns+'}name':action})
tree.write(manifest,encoding='utf-8',xml_declaration=True)
plist=mobile/'ios/Runner/Info.plist'
with plist.open('rb') as f:data=plistlib.load(f)
data.update(CFBundleDisplayName='ILMIGO DIGITAL ACADEMY',NSMicrophoneUsageDescription='Use your microphone for optional language speaking practice.',NSSpeechRecognitionUsageDescription='Turn your spoken practice phrase into text. You can type instead.')
with plist.open('wb') as f:plistlib.dump(data,f)
(mobile/'assets').mkdir(exist_ok=True)
shutil.copyfile(root/'shared/catalog.json',mobile/'assets/catalog.json')
subprocess.run(['flutter','pub','get'],cwd=mobile,check=True)
print('Native projects and permissions prepared. Run flutter analyze and flutter test, then build on a host with Android SDK or Xcode.')
