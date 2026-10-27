import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('paid iOS export requires matching owner settings and never treats unsigned configuration as a release',()=>{
 const result=spawnSync('python3',['-c',String.raw`
import importlib.util,tempfile,subprocess,json,plistlib,datetime,zipfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('iospaid','scripts/build-paid-ios.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert len(m.validate({}))>=8
with tempfile.TemporaryDirectory() as temporary:
 root=Path(temporary);mobile=root/'mobile';(mobile/'ios/Runner.xcworkspace').mkdir(parents=True)
 asset=mobile/'assets/catalog.json';asset.parent.mkdir();original=b'{"lessons":[{"id":"en-first"}],"languages":[]}';asset.write_bytes(original)
 project=mobile/'ios/Runner.xcodeproj/project.pbxproj';project.parent.mkdir()
 project_original=b'''// !$*UTF8*$!
{
 objects = {
 AAAAAAAAAAAAAAAAAAAAAAAA /* Runner */ = {
  isa = PBXNativeTarget;
  buildConfigurationList = BBBBBBBBBBBBBBBBBBBBBBBB /* Runner configs */;
  name = Runner;
 };
 BBBBBBBBBBBBBBBBBBBBBBBB /* Runner configs */ = {
  isa = XCConfigurationList;
  buildConfigurations = (
   CCCCCCCCCCCCCCCCCCCCCCCC /* Release */,
   DDDDDDDDDDDDDDDDDDDDDDDD /* Debug */,
  );
 };
 CCCCCCCCCCCCCCCCCCCCCCCC /* Release */ = {
  isa = XCBuildConfiguration;
  buildSettings = {
   CODE_SIGN_STYLE = Automatic;
   PRODUCT_BUNDLE_IDENTIFIER = com.old.runner;
   "CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Developer";
   PROVISIONING_PROFILE = "old-uuid";
   TEST_LITERAL = "a { string } /* ignore } */";
  };
  name = Release;
 };
 DDDDDDDDDDDDDDDDDDDDDDDD /* Debug */ = {
  isa = XCBuildConfiguration;
  buildSettings = {
   PRODUCT_BUNDLE_IDENTIFIER = com.old.runner.debug;
  };
  name = Debug;
 };
 EEEEEEEEEEEEEEEEEEEEEEEE /* Pods Release */ = {
  isa = XCBuildConfiguration;
  buildSettings = {
   PRODUCT_BUNDLE_IDENTIFIER = org.cocoapods.Flutter;
   CODE_SIGNING_ALLOWED = NO;
  };
  name = Release;
 };
 };
}
'''
 project.write_bytes(project_original)

 profile=root/'owner.mobileprovision';profile.write_bytes(b'fixture-CMS-not-a-real-profile')
 export=root/'ExportOptions.plist'
 team='A1B2C3D4E5';bundle='com.ilmigo.academy';name='ILMIGO Distribution';identity='Apple Distribution: Owner (A1B2C3D4E5)'
 options=dict(method='app-store-connect',teamID=team,signingStyle='manual',provisioningProfiles={bundle:name},destination='export',uploadSymbols=False,manageAppVersionAndBuildNumber=False)
 export.write_bytes(plistlib.dumps(options))
 env=dict(API_BASE_URL='https://academy.example',REVENUECAT_IOS_KEY='appl_public_fixture',ILMIGO_IOS_TEAM_ID=team,ILMIGO_IOS_BUNDLE_ID=bundle,ILMIGO_IOS_SIGNING_IDENTITY=identity,ILMIGO_IOS_PROFILE_NAME=name,ILMIGO_IOS_PROVISIONING_PROFILE=str(profile),ILMIGO_IOS_EXPORT_OPTIONS=str(export),ILMIGO_RELEASE_ACCEPTANCE='verified',PRIVATE_SERVER_SECRET='never-embed-this')
 assert m.validate(env)==[]
 for changes in [dict(teamID='ZZZZZZZZZZ'),dict(signingStyle='automatic'),dict(destination='upload'),dict(provisioningProfiles={bundle:'Other Profile'}),dict(uploadSymbols=True),dict(method='development')]:
  export.write_bytes(plistlib.dumps({**options,**changes}));assert m.validate(env)
 export.write_bytes(plistlib.dumps(options))
 calls=[];temp_configs=[];output=mobile/'build/ios/ilmigo-paid/ILMIGO.ipa';output.parent.mkdir(parents=True);output.write_bytes(b'stale')
 valid_profile=dict(Name=name,TeamIdentifier=[team],Entitlements={'application-identifier':team+'.'+bundle,'get-task-allow':False},ExpirationDate=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)+datetime.timedelta(days=30))
 def runner(args,**kwargs):
  calls.append(args)
  if args[:3]==['security','cms','-D']:return subprocess.CompletedProcess(args,0,stdout=plistlib.dumps(valid_profile),stderr=b'')
  if args[:2]==['security','find-identity']:return subprocess.CompletedProcess(args,0,stdout=('  1) '+'A'*40+' "'+identity+'"\n').encode(),stderr=b'')
  assert json.loads(asset.read_bytes())['lessons']==[];assert not output.exists()
  if args[0]=='flutter':
   assert '--config-only' in args and '--no-codesign' in args;assert project.read_bytes()==project_original
   config=Path(args[-1].split('=',1)[1]);temp_configs.append(config);defines=json.loads(config.read_text())
   assert defines==dict(API_BASE_URL=env['API_BASE_URL'],REVENUECAT_IOS_KEY=env['REVENUECAT_IOS_KEY'],ENABLE_PURCHASES=True,SUBSCRIPTIONS_REQUIRED=True)
   assert 'never-embed-this' not in config.read_text()
  elif args[0]=='xcodebuild' and 'archive' in args:
   assert not any(arg.startswith(('CODE_SIGN_', 'CODE_SIGNING_', 'DEVELOPMENT_TEAM=', 'PRODUCT_BUNDLE_IDENTIFIER=', 'PROVISIONING_PROFILE')) for arg in args)
   patched=project.read_text();assert patched.count('CODE_SIGN_STYLE = "Manual";')==1
   _,_,release=m._project_object(patched,'C'*24);assert 'PRODUCT_BUNDLE_IDENTIFIER = "'+bundle+'";' in release;assert 'PROVISIONING_PROFILE_SPECIFIER = "'+name+'";' in release;assert 'old-uuid' not in release;assert 'iPhone Developer' not in release
   for identifier in ['D'*24,'E'*24]:assert m._project_object(patched,identifier)[2]==m._project_object(project_original.decode(),identifier)[2]
   app=Path(args[args.index('-archivePath')+1])/'Products/Applications/Runner.app';app.mkdir(parents=True);(app/'Info.plist').write_bytes(plistlib.dumps({'CFBundleIdentifier':bundle}));(app/'embedded.mobileprovision').write_bytes(profile.read_bytes())
  elif args[0]=='xcodebuild' and '-exportArchive' in args:
   opts=plistlib.loads(Path(args[args.index('-exportOptionsPlist')+1]).read_bytes());assert opts['destination']=='export';assert not opts['uploadSymbols'];assert opts['signingCertificate']==identity
   destination=Path(args[args.index('-exportPath')+1]);destination.mkdir()
   with zipfile.ZipFile(destination/'Runner.ipa','w') as z:
    z.writestr('Payload/Runner.app/Info.plist',plistlib.dumps({'CFBundleIdentifier':bundle}));z.writestr('Payload/Runner.app/embedded.mobileprovision',profile.read_bytes())
  elif args[:2]==['codesign','--display']:return subprocess.CompletedProcess(args,0,stdout=b'',stderr=('Authority='+identity+'\nTeamIdentifier='+team+'\n').encode())
  return subprocess.CompletedProcess(args,0,stdout=b'',stderr=b'')
 assert m.build(root,env,runner,host='darwin',which=lambda _:True)==0
 assert output.is_file();assert asset.read_bytes()==original;assert project.read_bytes()==project_original;assert all(not p.exists() for p in temp_configs)
 count=len(calls)
 assert m.build(root,env,runner,host='linux',which=lambda _:True)==1;assert len(calls)==count
 assert m.build(root,env,runner,host='darwin',which=lambda _:False)==1;assert len(calls)==count
 def fail_archive(args,**kwargs):
  if args[0]=='xcodebuild' and 'archive' in args:raise subprocess.CalledProcessError(1,args)
  return runner(args,**kwargs)
 assert m.build(root,env,fail_archive,host='darwin',which=lambda _:True)==1;assert not output.exists();assert asset.read_bytes()==original;assert project.read_bytes()==project_original
 def unsigned_only(args,**kwargs):
  if args[0] in ['xcodebuild','codesign']:return subprocess.CompletedProcess(args,0,stdout=b'',stderr=b'')
  return runner(args,**kwargs)
 assert m.build(root,env,unsigned_only,host='darwin',which=lambda _:True)==1;assert not output.exists();assert asset.read_bytes()==original;assert project.read_bytes()==project_original
 valid_profile['ExpirationDate']=datetime.datetime(2000,1,1)
 before=len(calls);assert m.build(root,env,runner,host='darwin',which=lambda _:True)==1;assert len(calls)==before+1;assert asset.read_bytes()==original;assert project.read_bytes()==project_original
`],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr+result.stdout);
});
