import json
from pathlib import Path
from course_units import UNITS,EN_NOTES_UR,UR_NOTES_EN
ROOT=Path(__file__).resolve().parents[1]
LEVELS=['beginner','elementary','intermediate','advanced','professional']

def build(content):
    # Keep original IDs so existing learner progress survives the upgrade.
    lessons=[l for l in content['lessons'] if l['level']=='beginner']
    base_grammar={
      'hello':('Use a greeting, a question and a polite reply. In Urdu, aap (آپ) is a respectful form of you.','سلام، حال پوچھنے کا سوال اور شائستہ جواب دہرائیں۔ آپ احترام کا لفظ ہے۔'),
      'introductions':('Use My name is ... to introduce yourself. Urdu uses Mera naam ... hai. Notice the final hai (ہے).','انگریزی میں My name is ... اور اردو میں میرا نام ... ہے استعمال کریں۔ اردو میں آخری ہے پر غور کریں۔'),
      'numbers':('Use the numbers in a sentence, not just a list. Compare two books and three books. In Urdu: do kitaben, teen kitaben.','اعداد کو صرف فہرست میں نہیں، جملے میں بولیں۔ دو کتابیں اور تین کتابیں کا موازنہ کریں۔'),
      'daily':('English I read describes a habit. Urdu agreement can vary with the speaker: main parhta hoon / main parhti hoon.','I read عادت بیان کرتا ہے۔ اردو میں بولنے والے کے مطابق میں پڑھتا ہوں / میں پڑھتی ہوں استعمال کریں۔')}
    for l in lessons:
        slug=l['id'].split('-',1)[1]
        l['grammar']={'en':base_grammar[slug][0],'ur':base_grammar[slug][1]}
        l['writing']={'en':'Write three sentences using today’s phrases. Read them aloud, check each word, and repeat without looking.','ur':'آج کے جملوں سے تین جملے لکھیں۔ اونچی آواز میں پڑھیں، الفاظ دیکھیں اور پھر بغیر دیکھے دہرائیں۔'}
        l['rubric']={'en':['Uses the target phrases accurately','Pronounces slowly and intelligibly','Can repeat without reading'],'ur':['مطلوبہ جملے درست استعمال ہوں','آہستہ اور سمجھ آنے والی آواز ہو','بغیر پڑھے دہرا سکیں']}
        l['reviewStatus']='pending'
    for u in UNITS:
        for lang in ['en','ur']:
            checks=[]
            for q,qu,a,au,opts,optsu in u['checks']:
                checks.append(dict(question=q,questionUr=qu,answer=a if lang=='en' else au,options=opts if lang=='en' else optsu))
            words=[dict(text=e if lang=='en' else ur,meaning=e,meaningUr=ur,transliteration=e if lang=='en' else roman) for e,ur,roman in u['phrases']]
            dialogue=[dict(speaker='A' if i%2==0 else 'B',text=pair[0 if lang=='en' else 1],translation=pair[1 if lang=='en' else 0]) for i,pair in enumerate(u['dialogue'])]
            lessons.append(dict(id=f"{lang}-{u['slug']}",language=lang,level=u['level'],title=u['title'],titleUr=u['titleUr'],objective=u['objective'],objectiveUr=u['objectiveUr'],status='draft',reviewStatus='pending',premium=False,minutes=30,words=words,reading=u['reading'] if lang=='en' else u['readingUr'],readingUr=u['readingUr'],translation={'en':u['reading'],'ur':u['readingUr']},speaking=dialogue[0]['text'],grammar={'en':u['pattern'] if lang=='en' else UR_NOTES_EN[u['slug']],'ur':EN_NOTES_UR[u['slug']] if lang=='en' else u['patternUr']},dialogue=dialogue,writing={'en':u['task'],'ur':u['taskUr']},rubric={'en':['Addresses the task and audience','Uses today’s target expressions','Provides a clear order and reasons','Distinguishes facts from assumptions','States an actionable next step where relevant'],'ur':['کام اور مخاطب کے مطابق جواب','آج کے مطلوبہ جملوں کا استعمال','واضح ترتیب اور وجوہات','حقیقت اور مفروضے میں فرق','جہاں ضروری ہو واضح اگلا قدم']},quiz=checks[0],checks=checks))
    ordered=[]
    for language in ['en','ur']:
        for level in LEVELS:
            for l in [x for x in lessons if x['language']==language and x['level']==level]:
                l['order']=len([x for x in ordered if x['language']==language]);ordered.append(l)
    content['lessons']=ordered
    content['revision']=3
    content['curriculum']={'status':'draft','reviewStatus':'pending','languages':['en','ur'],'lessonsPerCourse':20,'plannedMinutesPerCourse':600,'description':'Original foundations-to-workplace practice curriculum. Not a CEFR qualification or guarantee of professional fluency.','descriptionUr':'بنیاد سے کام کی جگہ کی گفتگو تک اصل مشقی نصاب۔ یہ CEFR سند یا پیشہ ورانہ روانی کی ضمانت نہیں۔'}
    return content

def write(content):
    text=json.dumps(content,ensure_ascii=False,indent=2)+'\n'
    (ROOT/'shared').mkdir(parents=True,exist_ok=True)
    (ROOT/'mobile/assets').mkdir(parents=True,exist_ok=True)
    (ROOT/'shared/catalog.json').write_text(text)
    (ROOT/'mobile/assets/catalog.json').write_text(text)
    folder=ROOT/'courses';folder.mkdir(exist_ok=True)
    for lang,name in [('en','English'),('ur','Urdu')]:
        lines=[f'# ILMIGO DIGITAL ACADEMY · {name} — Foundations to workplace communication','', 'Original draft curriculum · qualified language/audio review pending.', '', '20 guided lessons · 600 planned minutes. Repetition and real conversation are additional. Completion is practice progress, not professional certification.','']
        for level in LEVELS:
            lines += [f'## {level.title()}','']
            for l in [x for x in content['lessons'] if x['language']==lang and x['level']==level]:
                lines += [f"### {l['order']+1}. {l['title']} / {l['titleUr']}",'',l['objective'],'',l['objectiveUr'],'','**Plan:** review 5m, words/patterns 8m, reading/listening 7m, speaking/writing 7m, assessment 3m.','', '**Target phrases**','']
                for w in l['words']:lines.append(f"- {w['text']} — {w['meaningUr'] if lang=='en' else w['meaning']} ({w['transliteration']})")
                lines += ['', '**Pattern / usage**','',l['grammar']['en'],'',l['grammar']['ur'],'','**Reading**','',l['reading'],'']
                if l.get('dialogue'):
                    lines+=['**Dialogue**','']+[f"- {d['speaker']}: {d['text']}" for d in l['dialogue']]+['']
                lines+=['**Speaking and writing task**','',l['writing']['en'],'',l['writing']['ur'],'','**Self-review (not automatic grading)**','']+['- '+r for r in l['rubric']['en']]+['','**Assessment and answer key**','']
                for i,q in enumerate(l.get('checks',[l['quiz']]),1):lines.extend([f"{i}. {q['question']} / {q['questionUr']}",f"   Options: {' | '.join(q['options'])}",f"   Answer: {q['answer']}"])
                lines+=['']
        (folder/f'{lang}-curriculum.md').write_text('\n'.join(lines)+'\n')

if __name__=='__main__':
    # Run create_content.py for the baseline, then build() adds the authored units.
    import runpy
    base=runpy.run_path(str(ROOT/'scripts/create_content.py'))['content']
    from foundation_courses import extend,export
    from course_quality import balance_assessments
    expanded=balance_assessments(extend(build(base)))
    write(expanded)
    export(expanded)
    print('Built 136 draft lessons: English/Urdu 20 each, 32 foundation courses 3 each. Qualified review pending.')
