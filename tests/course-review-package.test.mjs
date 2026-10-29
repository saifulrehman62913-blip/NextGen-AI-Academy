import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('review packets bind all course snapshots and never fabricate reviewer/audio approvals',()=>{
 const result=spawnSync('python3',['-c',String.raw`
import importlib.util,tempfile,zipfile,json,hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('review','scripts/package-course-review.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as tmp:
 output=Path(tmp)/'review.zip';audit=m.package(output)
 assert len(audit['languages'])==34 and sum(x['lessonCount'] for x in audit['languages'])==176
 assert not audit['qualifiedReviewCompleted'] and not audit['audioReviewCompleted'] and not audit['fullProfessionalCoursesCompleted']
 with zipfile.ZipFile(output) as z:
  for summary in audit['languages']:
   lang=summary['id'];course=json.loads(z.read(lang+'/course.json'));record=json.loads(z.read(lang+'/review-record.json'))
   canonical=json.dumps(course,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf8')
   assert hashlib.sha256(canonical).hexdigest()==record['courseSha256']==summary['courseSha256']
   assert record['reviewer'] is None and record['status']=='pending' and record['reviewedAt'] is None
   assert not record['languageApproval'] and not record['audioApproval'] and not record['professionalScopeApproval']
   assert record['audio']['recordings']==[] and not record['audio']['actualListeningCompleted']
   if lang not in ['en','ur']:assert len(summary['missingLevels'])==4
`],{encoding:'utf8'});assert.equal(result.status,0,result.stderr+result.stdout);
});
