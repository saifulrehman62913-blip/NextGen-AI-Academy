// Validate remote and cached data before Flutter's typed UI reads it.
bool validCatalog(dynamic value) {
  if (value is! Map || value['version'] != 1 || value['languages'] is! List || value['lessons'] is! List || value['levels'] is! List || value['blocks'] is! List) return false;
  bool string(dynamic v) => v is String && v.trim().isNotEmpty;
  final languages=value['languages'] as List;
  if (languages.isEmpty) return false;
  final ids=<String>{};
  for (final l in languages) {
    if (l is! Map || !string(l['id']) || !string(l['name']) || !string(l['native']) || !string(l['country']) || l['variants'] is! List || !['ltr','rtl'].contains(l['direction']) || !['sample','coming_soon'].contains(l['status']) || !ids.add(l['id'] as String)) return false;
  }
  final lessons=<String>{};
  for (final l in value['lessons'] as List) {
    if (l is! Map || !ids.contains(l['language']) || !['beginner','elementary','intermediate','advanced','professional'].contains(l['level']) || l['premium'] != false || l['minutes'] != 30) return false;
    for (final key in ['id','title','titleUr','objective','objectiveUr','reading','readingUr','speaking']) { if (!string(l[key])) return false; }
    if (!lessons.add(l['id'] as String) || l['words'] is! List || (l['words'] as List).isEmpty) return false;
    for (final word in l['words'] as List) { if (word is! Map) return false; for (final key in ['text','meaning','meaningUr','transliteration']) { if (!string(word[key])) return false; } }
    bool quiz(dynamic q){if(q is! Map || !string(q['question']) || !string(q['questionUr']) || !string(q['answer']) || q['options'] is! List)return false;final options=q['options'] as List;return options.length>=2 && options.length<=6 && options.every(string) && options.toSet().length==options.length && options.contains(q['answer']);}
    if(!quiz(l['quiz']))return false;
    if(l['checks']!=null && (l['checks'] is! List || (l['checks'] as List).isEmpty || (l['checks'] as List).length>10 || !(l['checks'] as List).every(quiz)))return false;
    for(final key in ['grammar','writing','translation']){if(l[key]!=null && (l[key] is! Map || !string(l[key]['en']) || !string(l[key]['ur'])))return false;}
    if(l['dialogue']!=null){if(l['dialogue'] is! List || (l['dialogue'] as List).length<2)return false;for(final d in l['dialogue'] as List){if(d is! Map || !string(d['speaker']) || !string(d['text']) || !string(d['translation']))return false;}}
    if(l['rubric']!=null){if(l['rubric'] is! Map)return false;for(final language in ['en','ur']){if(l['rubric'][language] is! List || (l['rubric'][language] as List).isEmpty || !(l['rubric'][language] as List).every(string))return false;}}

  }
  final blocks=value['blocks'] as List;
  if (blocks.length != 5) return false;
  int minutes=0;
  for (final b in blocks) { if (b is! Map || !string(b['id']) || !string(b['title']) || !string(b['titleUr']) || b['minutes'] is! int || (b['minutes'] as int)<1) return false; minutes+=b['minutes'] as int; }
  return minutes==30;
}
