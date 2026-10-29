import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('all 128 lesson audio scripts match exact text and never fabricate recordings or approvals',()=>{
 const r=spawnSync('python3',['-c',String.raw`
import importlib.util,tempfile,hashlib,zipfile,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('audio','scripts/prepare-audio-review.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as temp:
 dest=Path(temp)/'scripts.zip';manifest=m.prepare(dest)
 assert len(manifest['lessons'])==128 and len({x['language'] for x in manifest['lessons']})==32
 assert not manifest['audioGenerated'] and not manifest['qualifiedAudioApproval'] and not manifest['qualifiedLanguageApproval']
 assert manifest['estimatedSpeechCredits']==sum(x['estimatedSpeechCredits'] for x in manifest['lessons'])
 with zipfile.ZipFile(dest) as archive:
  assert not any(n.endswith('.mp3') for n in archive.namelist())
  for row in manifest['lessons']:
   assert archive.read(row['scriptFile']).decode()==row['script']+'\n'
   assert hashlib.sha256(row['script'].encode()).hexdigest()==row['scriptSha256']
   assert row['approval']=='pending' and row['reviewer'] is None and row['audioFile'] is None and row['audioSha256'] is None
   assert row['providerSupport']=='unverified' and not row['technicalAudioChecked'] and not row['pronunciationChecked']
   if row['language']=='skr':assert row['providerLanguageCode'] is None
`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr+r.stdout);
});
