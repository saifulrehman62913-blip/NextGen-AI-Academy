"""Authored introductory practice, not machine-translated professional courses."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
GLOSSES=['Hello / greeting','Goodbye / leaving','Thank you','Please / request','Yes / affirmation','No / negative reply','Excuse me / attention or passing','Sorry / apology','One','Two','Three','Four','My name is Ali.','What is your name?','Nice to meet you.','I am learning.']
URDU=['سلام / ملاقات','رخصت ہونے کا جملہ','شکریہ','درخواست میں شائستگی','ہاں / مثبت جواب','نہیں / منفی جواب','متوجہ کرنا یا گزرنے کی اجازت','معذرت','ایک','دو','تین','چار','میرا نام علی ہے۔','آپ کا نام کیا ہے؟','آپ سے مل کر خوشی ہوئی۔','میں سیکھ رہا ہوں / رہی ہوں۔']
UNITS=[('greetings','Greetings and courtesy','سلام اور شائستگی',0),('replies','Simple replies and apologies','سادہ جواب اور معذرت',4),('counting','Count from one to four','ایک سے چار گنیں',8),('introductions','Introduce yourself politely','شائستگی سے اپنا تعارف',12)]

def extend(content):
    data=json.loads((ROOT/'scripts/foundation_phrases.json').read_text())
    expected={l['id'] for l in content['languages']}-{'en','ur'}
    if set(data)!=expected:raise ValueError('Every expansion language must have one explicit phrase set.')
    for language in content['languages']:
        code=language['id']
        if code not in data:continue
        item=data[code];phrases=item['phrases']+item['introPhrases'];roman=item.get('roman',item['phrases'])+item['introRoman']
        if len(phrases)!=16 or len(roman)!=16 or any(not s.strip() for s in phrases+roman):raise ValueError('Incomplete phrase or transliteration set: '+code)
        language['status']='sample';language['courseType']='foundation_draft'
        for order,(slug,title,title_ur,start) in enumerate(UNITS):
            note=item['note']+(' '+item['introNote'] if slug=='introductions' else '')
            words=[dict(text=phrases[i],meaning=GLOSSES[i],meaningUr=URDU[i],transliteration=roman[i]) for i in range(start,start+4)]
            checks=[]
            for offset in range(4):
                i=start+offset
                # Some languages use one expression for both excuse me and sorry.
                # Deduplicate choices, never mark a synonym as a wrong choice.
                options=list(dict.fromkeys(phrases[start:start+4]));rotation=offset%len(options);options=options[rotation:]+options[:rotation]
                checks.append(dict(question=f"Choose the taught expression for: {GLOSSES[i]}.",questionUr=f'پڑھایا گیا لفظ یا جملہ منتخب کریں: {URDU[i]}۔',answer=phrases[i],options=options))
            reading='\n'.join(w['text'] for w in words)
            explanation='\n'.join(w['meaning'] for w in words)
            explanation_ur='\n'.join(w['meaningUr'] for w in words)
            lesson=dict(id=f'{code}-foundation-{slug}',language=code,level='beginner',order=order,title=title,titleUr=title_ur,
                objective=f"Read and practise four introductory {language['name']} expressions in their stated contexts.",objectiveUr='چار ابتدائی الفاظ یا جملے پڑھیں اور دیے گئے موقع کے مطابق دہرائیں۔',
                status='draft',reviewStatus='pending',premium=False,minutes=30,words=words,reading=reading,readingUr=explanation_ur,
                translation={'en':explanation,'ur':explanation_ur},speaking=words[0]['text'],
                grammar={'en':note+' This is an introductory phrase/citation-form lesson. Roman aids are approximate; they are not acoustic pronunciation scoring.',
                         'ur':'یہ ابتدائی الفاظ اور جملوں کا مسودہ ہے۔ انگریزی نوٹ میں رسم الخط، شائستگی، جنس، لہجے اور استعمال کی خاص باتیں دیکھیں۔ رومن مدد مکمل صوتی نقل نہیں؛ تلفظ اور زبان کا ماہر جائزہ ابھی باقی ہے۔'},
                dialogue=[{'speaker':'Practice partner' if j%2==0 else 'Learner','text':w['text'],'translation':w['meaning']} for j,w in enumerate(words)],
                writing={'en':'Copy each target expression carefully. Cover the model and write it from memory. Match each expression to its meaning. Practise saying all four with a partner; for counting, take turns in order. Do not treat the drill as a natural conversation.',
                         'ur':'ہر لفظ یا جملہ درست نقل کریں، نمونہ چھپا کر یاد سے لکھیں اور معنی ملائیں۔ ساتھی کے ساتھ چاروں دہرائیں؛ گنتی باری باری کریں۔ یہ مشق ہے، قدرتی مکالمہ ہونے کا دعویٰ نہیں۔'},
                rubric={'en':['Checks the exact target script and marks','Matches each expression to the taught context','Uses the language-specific usage note','Repeats all four items; seeks qualified pronunciation feedback'],
                        'ur':['اصل رسم الخط اور اعراب دیکھیں','جملے کو سکھائے گئے موقع سے ملائیں','زبان کا استعمال سمجھانے والا نوٹ پڑھیں','چاروں دہرائیں؛ ماہر سے تلفظ چیک کروائیں']},quiz=checks[0],checks=checks,
                practiceType='phrase_drill',scope='introductory_foundation',usageNote=note)
            if slug=='introductions':
                lesson['writing']={'en':'Introduce yourself with your own name in place of Ali. Ask a partner their name using the taught form, then use the meeting and learning expressions. Write a four-line introduction and repeat it without reading. Confirm gender and respectful-address changes with a competent speaker; do not invent word-for-word translations.',
                    'ur':'علی کی جگہ اپنا نام استعمال کر کے تعارف کروائیں۔ سکھائے گئے انداز میں ساتھی کا نام پوچھیں، پھر ملنے اور سیکھنے کے جملے بولیں۔ چار سطروں کا تعارف لکھ کر بغیر پڑھے دہرائیں۔ جنس اور احترام کے مطابق تبدیلی ماہر سے چیک کروائیں؛ لفظ بہ لفظ ترجمہ خود نہ گھڑیں۔'}
            content['lessons'].append(lesson)
    content['revision']=4
    content['curriculum'].pop('lessonsPerCourse',None)
    content['curriculum'].pop('plannedMinutesPerCourse',None)
    content['curriculum']['plannedMinutesByLanguage']={l['id']:30*sum(x['language']==l['id'] for x in content['lessons']) for l in content['languages']}
    content['curriculum'].update(languages=[l['id'] for l in content['languages']],foundationLessonsPerNewCourse=4,
        lessonCounts={l['id']:sum(x['language']==l['id'] for x in content['lessons']) for l in content['languages']},
        description='English/Urdu: 20 draft lessons each. Other 32 languages: four introductory foundation lessons each. All require qualified review; not complete professional-fluency courses.')
    return content

def export(content):
    for language in content['languages']:
        if language['id'] in ('en','ur'):continue
        lines=[f"# ILMIGO · {language['name']} introductory foundation",'', 'Original draft: qualified language and audio review pending. Four suggested 30-minute practice sessions. Not a complete professional course.','', 'Reading, partner drill, writing and four answer-key checks per lesson. Roman aids are approximate.','']
        for lesson in [l for l in content['lessons'] if l['language']==language['id']]:
            lines.extend([f"## {lesson['title']}",'',lesson['usageNote'],'', '**Daily plan:** 5m review, 8m words/patterns, 7m read/listen, 7m speak/write, 3m assessment.',''])
            lines.extend(f"- {w['text']} — {w['meaning']} / {w['meaningUr']} ({w['transliteration']})" for w in lesson['words'])
            lines.extend(['', '**Reading / drill**','',lesson['reading'],'',lesson['writing']['en'],'','**Quiz answer key**',''])
            lines.extend(f"- {q['question']} → {q['answer']}" for q in lesson['checks']);lines.append('')
        (ROOT/f"courses/{language['id']}-curriculum.md").write_text('\n'.join(lines)+'\n')
