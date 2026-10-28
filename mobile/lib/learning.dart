import 'dart:convert';
import 'dart:math';
import 'validation.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

List<Map<String,dynamic>> lessonQuestions(Map<String,dynamic> lesson)=>List<Map<String,dynamic>>.from(lesson['checks'] as List? ?? [lesson['quiz']]);

String newProfileId() { final r=Random.secure();return List.generate(16,(_)=>r.nextInt(256).toRadixString(16).padLeft(2,'0')).join(); }

const goalLabels={'Everyday conversation':'روزمرہ کی گفتگو','Travel & connections':'سفر اور تعلقات','School & study':'سکول اور تعلیم','Work & interviews':'کام اور انٹرویو'};
String speechLocale(String language)=>const {'en':'en-US','ur':'ur-PK','pa':'pa-PK','sd':'sd-PK','skr':'skr-PK','ps':'ps-AF','fa':'fa-IR','ar':'ar-SA','tr':'tr-TR','hi':'hi-IN','bn':'bn-BD','gu':'gu-IN','ta':'ta-IN','te':'te-IN','ml':'ml-IN','ne':'ne-NP','si':'si-LK','zh':'zh-CN','ja':'ja-JP','ko':'ko-KR','id':'id-ID','ms':'ms-MY','th':'th-TH','vi':'vi-VN','fr':'fr-FR','es':'es-ES','de':'de-DE','it':'it-IT','pt':'pt-PT','ru':'ru-RU','nl':'nl-NL','pl':'pl-PL','sw':'sw-KE','so':'so-SO'}[language]??language;

String dayKey([DateTime? date]) {
  final d = date ?? DateTime.now();
  return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

class Learner {
  Learner({required this.id, required this.name, this.kind = 'adult', this.language = 'en', this.goal = 'Everyday conversation', this.cloudId, Map<String, dynamic>? completed, Map<String, dynamic>? sessions, Map<String,dynamic>? drafts, List<String>? days})
      : completed = completed ?? {}, sessions = sessions ?? {}, drafts=drafts??{}, days = days ?? [];
  final String id;
  String name, kind, language, goal;
  String? cloudId;
  final Map<String, dynamic> completed, sessions, drafts;
  final List<String> days;
  bool get isChild => kind == 'child';
  int get xp => completed.length * 30;
  int streak([DateTime? at]) {
    final now = at ?? DateTime.now();
    var date = DateTime(now.year, now.month, now.day);
    if (!days.contains(dayKey(date))) date = DateTime(date.year, date.month, date.day - 1);
    var count = 0;
    while (days.contains(dayKey(date))) { count++; date = DateTime(date.year, date.month, date.day - 1); }
    return count;
  }
  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'kind': kind, 'language': language, 'goal': goal, 'cloudId': cloudId, 'completed': completed, 'sessions': sessions, 'drafts':drafts, 'days': days};
  factory Learner.fromJson(Map<String,dynamic> m) {
    final id=m['id'];if(id is! String || id.isEmpty)throw const FormatException('Invalid profile identity');
    bool validDay(dynamic value){if(value is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value))return false;final d=DateTime.tryParse(value);return d!=null && dayKey(d)==value;}
    final completed=<String,dynamic>{};
    if(m['completed'] is Map){for(final entry in (m['completed'] as Map).entries){final a=entry.value;if(entry.key is String && a is Map && validDay(a['date']))completed[entry.key as String]={'date':a['date'],'score':1};}}
    final sessions=<String,dynamic>{};
    if(m['sessions'] is Map){for(final entry in (m['sessions'] as Map).entries){final a=entry.value;if(entry.key is String && a is Map && a['index'] is int && (a['index'] as int)>=0 && (a['index'] as int)<=4 && a['seconds'] is num && (a['seconds'] as num).isFinite && (a['seconds'] as num)>=0)sessions[entry.key as String]={'index':a['index'],'seconds':(a['seconds'] as num).toInt(),'answers':a['answers'] is List?(a['answers'] as List).take(10).map((v)=>v is String?v:null).toList():[],'writing':a['writing'] is String?a['writing']:''};}}
    final name=m['name'] is String && (m['name'] as String).trim().isNotEmpty?m['name'] as String:'Learner';
    return Learner(id:id,name:name.length>40?name.substring(0,40):name,kind:m['kind']=='child'?'child':'adult',language:m['language'] is String?m['language'] as String:'en',goal:goalLabels.containsKey(m['goal'])?m['goal'] as String:'Everyday conversation',cloudId:m['cloudId'] is String?m['cloudId'] as String:null,completed:completed,sessions:sessions,drafts:m['drafts'] is Map?Map<String,dynamic>.fromEntries((m['drafts'] as Map).entries.where((e)=>e.key is String && e.value is String).map((e)=>MapEntry(e.key as String,(e.value as String).length>4000?(e.value as String).substring(0,4000):e.value))):{},days:m['days'] is List?(m['days'] as List).where(validDay).cast<String>().toSet().toList():[]);
  }

}

class LearningStore extends ChangeNotifier {
  final List<Learner> profiles = [];
  Map<String, dynamic> catalog = {};
  String active = '', ui = 'en';
  String? ownerId;
  String get storageKey => 'ilmigo-v2:${ownerId ?? 'guest'}';
  bool hasAccount(String id) => _prefs?.containsKey('ilmigo-v2:$id') ?? false;
  bool get parentPinConfigured => _prefs?.containsKey('$storageKey:parent') ?? false;
  String? get parentCredential => _prefs?.getString('$storageKey:parent');
  Future<void> clearParentCredential() async {await _prefs!.remove('$storageKey:parent');}
  Future<void> saveParentCredential(String value) async { await _prefs!.setString('$storageKey:parent',value); }
  bool onboarded = false;
  SharedPreferences? _prefs;
  String? persistenceError;
  Learner get learner => profiles.firstWhere((p) => p.id == active, orElse: () => profiles.first);
  List<Map<String, dynamic>> get languages => List<Map<String, dynamic>>.from(catalog['languages'] as List);
  List<Map<String, dynamic>> get allLessons => List<Map<String, dynamic>>.from(catalog['lessons'] as List);
  List<Map<String, dynamic>> get lessons => allLessons.where((l) => l['language'] == learner.language).toList();
  Map<String, dynamic> get language => languages.firstWhere((l) => l['id'] == learner.language, orElse: () => languages.firstWhere((l) => l['id'] == 'en'));
  Map<String, dynamic>? get nextLesson => lessons.isEmpty ? null : lessons.firstWhere((l) => !learner.completed.containsKey(l['id']), orElse: () => lessons.first);
  String t(String en, String ur) => ui == 'ur' ? ur : en;
  int get plannedMinutesToday => learner.days.contains(dayKey()) || allLessons.any((l) => learner.completed[l['id']]?['date'] == dayKey()) ? 30 : 0;
  Future<void> load() async {
    final bundled=jsonDecode(await rootBundle.loadString('assets/catalog.json'));
    if (!validCatalog(bundled)) throw const FormatException('Invalid bundled catalog');
    catalog=Map<String,dynamic>.from(bundled as Map);
    _prefs=await SharedPreferences.getInstance();
    try { final cached=jsonDecode(_prefs!.getString('ilmigo-catalog-v2') ?? 'null'); if(validCatalog(cached) && ((cached['revision'] as int?)??1)>=((catalog['revision'] as int?)??1)) catalog=Map<String,dynamic>.from(cached as Map); } catch (_) { /* Valid bundled lessons remain available. */ }
    await switchAccount(null, persistCurrent:false);
  }
  Future<void> cacheCatalog(Map<String,dynamic> value) async {
    if(!validCatalog(value)) throw const FormatException('Invalid remote catalog');
    if(((value['revision'] as int?)??1)<((catalog['revision'] as int?)??1))throw const FormatException('Older curriculum cannot replace the current downloaded lessons');
    // Save successfully before showing a collection as available offline.
    final ok=await _prefs!.setString('ilmigo-catalog-v2',jsonEncode(value));
    if(!ok) throw Exception('Could not download lessons. Check device storage.');
    catalog=value;notifyListeners();
  }
  Future<void> switchAccount(String? account,{bool persistCurrent=true}) async {
    if(persistCurrent && profiles.isNotEmpty){await save();if(persistenceError!=null)throw Exception(persistenceError);}
    ownerId=account;profiles.clear();active='';onboarded=false;ui='en';
    try {
      String? stored=_prefs!.getString(storageKey);
      if(stored==null && account==null) stored=_prefs!.getString('ilmigo-v1');
      final raw=jsonDecode(stored ?? '{}');
      if(raw is Map && raw['version']==1 && raw['profiles'] is List){
        final loaded=<Learner>[];
        for(final item in raw['profiles'] as List){if(item is! Map)continue;try{final p=Learner.fromJson(Map<String,dynamic>.from(item));if(account==null)p.cloudId=null;loaded.add(p);}catch(_){/* Skip malformed profiles individually. */}}
        profiles.addAll(loaded);active=raw['active'] is String?raw['active'] as String:'';ui=raw['ui']=='ur'?'ur':'en';onboarded=raw['onboarded']==true;
      }
    }catch(_){persistenceError='Saved progress could not be read. A new local profile was opened.';}
    if(profiles.isEmpty)profiles.add(Learner(id:newProfileId(),name:'Learner'));
    if(!profiles.any((p)=>p.id==active))active=profiles.first.id;
    notifyListeners();
  }
  Future<void> save() async {
    try{final ok=await _prefs!.setString(storageKey,jsonEncode({'version':1,'ownerId':ownerId,'active':active,'ui':ui,'onboarded':onboarded,'profiles':profiles.map((p)=>p.toJson()).toList()}));persistenceError=ok?null:'Progress could not be saved. Check device storage.';}catch(_){persistenceError='Progress could not be saved. Check device storage.';}notifyListeners();
  }
  bool complete(Map<String,dynamic> lesson,Object? answer) {
    final questions=lessonQuestions(lesson),answers=answer is List?answer:[answer];
    if(answers.length<questions.length)return false;
    int correct=0;for(int i=0;i<questions.length;i++){if(!(questions[i]['options'] as List).contains(answers[i]))return false;if(answers[i]==questions[i]['answer'])correct++;}
    final score=correct/questions.length;if(score<0.8)return false;
    learner.completed[lesson['id'] as String]={'date':dayKey(),'score':score};
    if(!learner.days.contains(dayKey()))learner.days.add(dayKey());learner.sessions.remove(lesson['id']);return true;
  }

  void mergeCloud(List<dynamic> rows,{bool restore=false}) {
    if(restore && rows.isNotEmpty) profiles.clear();
    for (final raw in rows) {
      final row = raw as Map<String, dynamic>;
      Learner? local;
      for(final p in profiles){if(p.cloudId==row['id']){local=p;break;}}
      if(local==null){for(final p in profiles){if(p.cloudId==null&&p.id==row['localId']&&p.kind==row['kind']){local=p;break;}}}
      local ??= Learner(id: profiles.any((p)=>p.id==(row['localId']??row['id']))?newProfileId():(row['localId']??row['id']) as String, name: row['name'] as String, kind: row['kind'] as String, language: row['language'] as String, goal: row['goal'] as String? ?? 'Everyday conversation');
      if (!profiles.contains(local)) profiles.add(local);
      local.cloudId = row['id'] as String;
      local.name=row['name'] as String;local.kind=row['kind'] as String;local.language=row['language'] as String;local.goal=goalLabels.containsKey(row['goal'])?row['goal'] as String:'Everyday conversation';
      for(final entry in Map<String,dynamic>.from(row['completed'] as Map).entries){final old=local.completed[entry.key];if(old==null || (entry.value['date'] as String).compareTo(old['date'] as String)>0)local.completed[entry.key]=entry.value;}
      for(final date in List<String>.from(row['days'] as List? ?? [])){if(!local.days.contains(date))local.days.add(date);}
      for (final item in local.completed.values) { final date = (item as Map)['date'] as String; if (!local.days.contains(date)) local.days.add(date); }
    }
    if(!profiles.any((p)=>p.id==active))active=profiles.first.id;
  }
  Future<void> clear() async { profiles.clear();profiles.add(Learner(id:newProfileId(),name:'Learner'));active=profiles.first.id;onboarded=false;if(ownerId==null)await _prefs!.remove('ilmigo-v1');await save(); }
  Future<int> importGuest() async {
    if(ownerId==null)throw Exception('Sign in first.');
    final raw=jsonDecode(_prefs!.getString('ilmigo-v2:guest') ?? _prefs!.getString('ilmigo-v1') ?? '{}');
    if(raw is! Map || raw['profiles'] is! List)return 0;final list=raw['profiles'] as List;
    if(profiles.length+list.length>12)throw Exception('A family can have up to 12 profiles.');
    final imported=list.map((p)=>Learner.fromJson({...Map<String,dynamic>.from(p as Map),'id':newProfileId(),'cloudId':null})).toList();profiles.addAll(imported);await save();return imported.length;
  }
  Future<void> deleteAccountStore() async { await _prefs!.remove(storageKey);await _prefs!.remove('$storageKey:parent');await switchAccount(null,persistCurrent:false); }
}
