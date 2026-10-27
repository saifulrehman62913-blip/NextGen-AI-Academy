import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('paid build rejects incomplete setup and restores lesson assets on success and failure',()=>{
 const r=spawnSync('python3',['-c',String.raw`
import importlib.util,sys,tempfile,json,subprocess
from pathlib import Path
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('paid','scripts/build-paid-android.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert len(m.validate({}))>=7
for url in ['http://academy.example','https://user:password@academy.example','https://academy.example/path','https://academy.example?secret=hidden']:
 assert any('API_BASE_URL' in x for x in m.validate({'API_BASE_URL':url}))
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp);asset=root/'mobile/assets/catalog.json';asset.parent.mkdir(parents=True);original=b'{"lessons":[{"id":"en-one"}],"languages":[]}';asset.write_bytes(original)
 gradle=root/'mobile/android/app/build.gradle.kts';gradle.parent.mkdir(parents=True);gradle.write_text(m.MARKER)
 key=root/'owner.jks';key.write_bytes(b'fixture-not-a-real-key')
 env=dict(API_BASE_URL='https://academy.example',REVENUECAT_ANDROID_KEY='goog_public_fixture',ILMIGO_ANDROID_KEYSTORE=str(key),ILMIGO_ANDROID_STORE_PASSWORD='private-store-fixture',ILMIGO_ANDROID_KEY_ALIAS='upload',ILMIGO_ANDROID_KEY_PASSWORD='private-key-fixture',ILMIGO_RELEASE_ACCEPTANCE='verified')
 assert m.validate(env)==[]
 output=root/'mobile/build/app/outputs/bundle/release/app-release.aab';output.parent.mkdir(parents=True)
 called=[]
 def runner(args,**kwargs):
  called.append(args);assert json.loads(asset.read_bytes())['lessons']==[]
  config=Path(args[-1].split('=',1)[1]);defines=json.loads(config.read_text());assert defines['SUBSCRIPTIONS_REQUIRED'] is True;assert defines['ENABLE_PURCHASES'] is True
  assert 'private-store-fixture' not in config.read_text();assert 'private-key-fixture' not in config.read_text()
  assert not output.exists();output.write_bytes(b'fixture-not-a-real-AAB')
 assert m.build(root,env,runner)==0;assert asset.read_bytes()==original
 assert not Path(called[0][-1].split('=',1)[1]).exists()
 def failure(*args,**kwargs):raise subprocess.CalledProcessError(1,args[0])
 assert m.build(root,env,failure)==1;assert asset.read_bytes()==original;assert not output.exists()
 assert m.build(root,{**env,'ILMIGO_RELEASE_ACCEPTANCE':''},runner)==1;assert len(called)==1
`],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr+r.stdout);
});
