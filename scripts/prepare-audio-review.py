#!/usr/bin/env python3
"""Prepare exact source scripts and unapproved audio evidence rows. Generates no audio."""
from pathlib import Path
import hashlib,json,math,zipfile
ROOT=Path(__file__).resolve().parents[1]

def prepare(destination):
    catalog=json.loads((ROOT/'shared/catalog.json').read_text())
    manifest={'catalogRevision':catalog['revision'],'audioGenerated':False,'qualifiedLanguageApproval':False,'qualifiedAudioApproval':False,'estimatedCreditsRule':'Runway speech: ceil(characters/50), minimum one per separate lesson call; estimate only, not a charge or provider guarantee.','lessons':[]}
    with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED) as archive:
        for language in catalog['languages']:
            if language['id'] in ('en','ur'):continue
            for lesson in [l for l in catalog['lessons'] if l['language']==language['id']]:
                script=lesson['reading']
                row={'language':language['id'],'languageName':language['name'],'lessonId':lesson['id'],'script':script,'scriptSha256':hashlib.sha256(script.encode()).hexdigest(),
                     'targetPhrases':[w['text'] for w in lesson['words']],'scriptFile':f"{language['id']}/{lesson['id']}.txt",'proposedAudioFile':f"{language['id']}/{lesson['id']}.mp3",'audioFile':None,'audioSha256':None,
                     'providerSupport':'unverified','providerLanguageCode':language['id'] if len(language['id'])==2 else None,
                     'providerRestriction':'Saraiki has no ISO 639-1 code; do not silently substitute Urdu/Punjabi or claim provider support.' if language['id']=='skr' else 'Confirm actual provider language support and native-quality voice before generation.',
                     'estimatedSpeechCredits':max(1,math.ceil(len(script)/50)),
                     'technicalAudioChecked':False,'transcriptChecked':False,'pronunciationChecked':False,'reviewer':None,'reviewedAt':None,'approval':'pending',
                     'issues':[]}
                manifest['lessons'].append(row);archive.writestr(row['scriptFile'],script+'\n')
        manifest['estimatedSpeechCredits']=sum(l['estimatedSpeechCredits'] for l in manifest['lessons'])
        archive.writestr('audio-review-manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        archive.writestr('READ-ME.md','''# Pending audio production and review

This archive contains exact lesson reading scripts, not audio files or approvals. Every evidence field is empty/pending.
The owner requires a free-only workflow: do not purchase a plan or invoke paid speech generation. The connected Free workspace has no available speech models. Existing device/browser TTS is a playback option where a target-language voice is installed; it does not create these recording files. To populate this archive, supply permitted native-speaker recordings or use a verified free speech engine that supports the exact target language. Never silently substitute another language. Any credit estimates in the manifest are historical planning metadata, not authorization to spend.

Before approval: create or supply the actual recording, record its SHA-256 and provider/locale/voice/version, check decoding/duration/silence, then have a competent language reviewer listen to the full recording and compare every phrase with the approved target text. Check accents, tones, vowel length, register, dialect and script-specific pronunciation. Record corrections, reviewer identity/competence and date. Bind approval to both the script and recording hashes. A changed script, voice or recording requires renewed review.

These lesson recordings alone do not validate every device's TTS voice, arbitrary AI replies or all individual-word playback. Device/provider audio can vary. They also do not turn three beginner lessons into a complete professional course. No audio or human review has been created by this packaging command.
''')
    return manifest

if __name__=='__main__':
    target=ROOT.parent/'ILMIGO-32-language-audio-review-scripts.zip'
    result=prepare(target);print(json.dumps({'scripts':len(result['lessons']),'estimatedSpeechCredits':result['estimatedSpeechCredits'],'audioGenerated':False,'qualifiedAudioApproval':False,'output':str(target)}))
