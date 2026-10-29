"""Deterministic assessment layout; preserves IDs, answer text and saved selections."""
def balance_assessments(content):
    counts={}
    for lesson in content['lessons']:
        language=lesson['language'];questions=lesson.get('checks',[lesson['quiz']])
        for question in questions:
            choices=question['options'];answer=question['answer']
            if len(set(choices))!=len(choices) or answer not in choices:raise ValueError('Malformed quiz before balancing')
            index=counts.get(language,0);counts[language]=index+1
            target=(sum(map(ord,language))+index)%len(choices)
            wrong=[choice for choice in choices if choice!=answer]
            question['options']=wrong[:target]+[answer]+wrong[target:]
        lesson['quiz']=questions[0]
    content['revision']=7
    return content
