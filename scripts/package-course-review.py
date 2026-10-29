#!/usr/bin/env python3
"""Package complete course snapshots for real reviewers. Never creates approvals."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[1]
VERSION=json.loads((ROOT/'package.json').read_text())['version']

def package(destination):
    catalog=json.loads((ROOT/'shared/catalog.json').read_text())
    audit={'version':VERSION,'catalogRevision':catalog['revision'],'qualifiedReviewCompleted':False,'audioReviewCompleted':False,'fullProfessionalCoursesCompleted':False,'languages':[]}
    instructions='''# ILMIGO qualified review handoff

This archive is a review request, NOT approval evidence. All review records are pending.
For each language: open course.json alongside the curriculum Markdown. Record corrections by lesson ID and field. Verify meaning, spelling, script/direction, dialect, grammatical gender, politeness/register, natural usage and transliteration. Validate that every quiz has one intended answer in context; report acceptable alternatives rather than forcing an arbitrary synonym choice.

Audio: obtain the actual device/provider recordings for each target phrase, reading and dialogue. A qualified speaker must listen and check pronunciation, tone/stress, accent/dialect and text alignment. Record exact provider/locale/voice/version, sample file/reference, reviewer identity, competence, date and issues. Approximate Roman aids and a provider's voice-availability flag are not audio approval.

Course scope: English/Urdu have 20 draft lessons; other languages have four introductory lessons. A few workplace activities or a professional level label do not establish complete professional fluency. Specify missing objectives, prerequisites, grammar, vocabulary, listening, interaction, writing, assessment and feedback before approving a complete course. Swabi-specific Pashto has not been authored separately.

Keep reviewer personal evidence private; do not commit private contact/identity documents to the public repository. SHA-256 binds each record to its exact course snapshot. Content/audio changes require renewed review of affected material. This tool cannot authenticate reviewer credentials and does not update publishing permissions or the app's pending review status.
'''
    with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('START-HERE.md',instructions)
        for language in catalog['languages']:
            code=language['id'];lessons=[l for l in catalog['lessons'] if l['language']==code]
            canonical=json.dumps(lessons,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf8')
            digest=hashlib.sha256(canonical).hexdigest()
            coverage={level:sum(l['level']==level for l in lessons) for level in catalog['levels']}
            record={'language':code,'courseSha256':digest,'status':'pending','reviewer':None,'qualificationEvidence':None,'reviewedAt':None,'languageApproval':False,'audioApproval':False,'professionalScopeApproval':False,'issues':[],
                    'audio':{'source':'device/provider dependent','provider':None,'locale':None,'voice':None,'version':None,'recordings':[],'actualListeningCompleted':False},
                    'lessons':[{'lessonId':l['id'],'languageChecked':False,'translationChecked':False,'quizChecked':False,'audioChecked':False,'notes':''} for l in lessons]}
            summary={'id':code,'name':language['name'],'lessonCount':len(lessons),'plannedMinutes':len(lessons)*30,'levelCoverage':coverage,'missingLevels':[k for k,v in coverage.items() if not v],'courseSha256':digest,'reviewStatus':'pending','audioRecordingsSupplied':0}
            audit['languages'].append(summary)
            archive.writestr(code+'/course.json',json.dumps(lessons,ensure_ascii=False,indent=2)+'\n')
            archive.writestr(code+'/review-record.json',json.dumps(record,ensure_ascii=False,indent=2)+'\n')
            source=ROOT/f'courses/{code}-curriculum.md'
            archive.writestr(code+'/curriculum.md',source.read_text())
        archive.writestr('technical-scope-audit.json',json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    return audit

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',default=str(ROOT.parent/f'ILMIGO-qualified-review-packets-v{VERSION}.zip'));args=parser.parse_args()
    audit=package(Path(args.output));print(f"Prepared {len(audit['languages'])} review packets. No language/audio/professional approval is claimed.")
