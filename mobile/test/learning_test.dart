import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ilmigo/learning.dart';
import 'package:ilmigo/main.dart';
import 'package:ilmigo/validation.dart';
import 'package:ilmigo/parent.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test('streak crosses month boundaries and survives a missed current day', () {
    final p=Learner(id:'a',name:'Ali',days:['2026-09-30','2026-10-01']);
    expect(p.streak(DateTime(2026,10,2)),2);
    expect(p.streak(DateTime(2026,10,3)),0);
  });
  test('incorrect quiz does not complete; replay does not duplicate XP', () async {
    final s=LearningStore();await s.load();final l=s.nextLesson!;
    expect(s.complete(l,'incorrect'),false);expect(s.learner.xp,0);
    expect(s.complete(l,(l['quiz'] as Map)['answer'] as String),true);expect(s.learner.xp,30);
    s.complete(l,(l['quiz'] as Map)['answer'] as String);expect(s.learner.xp,30);
    await s.save();final restored=LearningStore();await restored.load();expect(restored.learner.xp,30);
  });
  test('family progress remains separate', () async {
    final s=LearningStore();await s.load();final lesson=s.nextLesson!;
    s.complete(lesson,(lesson['quiz'] as Map)['answer'] as String);
    s.profiles.add(Learner(id:'child',name:'Mina',kind:'child'));s.active='child';
    expect(s.learner.completed,isEmpty);expect(s.learner.isChild,true);
  });
  test('catalog contains 34 languages and a 30-minute daily plan', () async {
    final c=jsonDecode(await rootBundle.loadString('assets/catalog.json')) as Map;
    expect((c['languages'] as List).length,34);
    expect((c['blocks'] as List).fold<int>(0,(n,b)=>n+(b['minutes'] as int)),30);
  });

  test('R01 accounts and guest progress stay isolated across sign-out and restart', () async {
    final s=LearningStore();await s.load();s.learner.name='Guest';await s.save();
    await s.switchAccount('A');s.learner.name='Private A';await s.save();
    await s.switchAccount('B');expect(s.learner.name,'Learner');s.learner.name='Private B';await s.save();
    await s.switchAccount('A');expect(s.learner.name,'Private A');
    await s.switchAccount(null);expect(s.learner.name,'Guest');
    final fresh=LearningStore();await fresh.load();expect(fresh.learner.name,'Guest');await fresh.switchAccount('B');expect(fresh.learner.name,'Private B');
  });
  test('R02 latest completion and full day history survive cloud merge', () async {
    final s=LearningStore();await s.load();final id=s.learner.id;
    s.learner.completed['en-hello']={'date':'2026-10-26','score':1};s.learner.days.add('2026-10-26');
    s.mergeCloud([{'id':'cloud','localId':id,'name':'Learner','kind':'adult','language':'en','goal':'Everyday conversation','completed':{'en-hello':{'date':'2026-10-25','score':1}},'days':['2026-10-24','2026-10-25']}]);
    expect(s.learner.completed['en-hello']['date'],'2026-10-26');expect(s.learner.days.toSet(),{'2026-10-24','2026-10-25','2026-10-26'});
  });
  test('R06 validated downloaded catalog survives app restart; malformed data rejected', () async {
    final s=LearningStore();await s.load();final downloaded=Map<String,dynamic>.from(jsonDecode(jsonEncode(s.catalog)) as Map);
    downloaded['lessons'][0]['title']='Downloaded title';await s.cacheCatalog(downloaded);
    final fresh=LearningStore();await fresh.load();expect(fresh.catalog['lessons'][0]['title'],'Downloaded title');
    downloaded['lessons'][0]['quiz']['options']='invalid';expect(validCatalog(downloaded),false);await expectLater(s.cacheCatalog(downloaded),throwsFormatException);
  });
  test('parent PIN is hashed separately from progress and scoped by account', () async {
    final s=LearningStore();await s.load();await s.switchAccount('A');final gate=ParentGate(s);await gate.setup('284619');
    expect(await gate.verify('284619'),true);expect(await gate.verify('000000'),false);expect(s.parentCredential!.contains('284619'),false);
    await s.switchAccount('B');expect(s.parentPinConfigured,false);await s.switchAccount('A');expect(s.parentPinConfigured,true);
  });
  test('curriculum covers five stages and professional assessment checks every answer', () async {
    final s=LearningStore();await s.load();expect(s.lessons.length,20);
    for(final stage in ['beginner','elementary','intermediate','advanced','professional']){expect(s.lessons.where((l)=>l['level']==stage).length,4);}
    final l=s.lessons.firstWhere((l)=>l['level']=='professional');expect(s.complete(l,l['quiz']['answer']),false);expect(s.complete(l,lessonQuestions(l).map((q)=>q['answer']).toList()),true);
  });
  testWidgets('dashboard opens with honest guest progress', (tester) async {
    final s=LearningStore();
    // Asset decoding may use a real isolate for the larger curriculum. Load it
    // outside the widget fake clock rather than deadlocking the test harness.
    await tester.runAsync(() => s.load());
    s.onboarded=true;
    await tester.pumpWidget(IlmigoApp(store:s));await tester.pump();
    expect(find.text('ILMIGO'),findsOneWidget);
    expect(find.text('Hello, Learner ☀'),findsOneWidget);
    expect(find.text('0'),findsWidgets);
    await tester.pumpWidget(const SizedBox());
  }, timeout: const Timeout(Duration(seconds:60)));
  testWidgets('restored custom goal opens and stays current after goal changes', (tester) async {
    final s=LearningStore();await tester.runAsync(() => s.load());s.onboarded=true;
    s.learner.goal='Medical interview preparation';
    await tester.pumpWidget(IlmigoApp(store:s));await tester.pump();
    await tester.tap(find.text('My space'));await tester.pumpAndSettle();
    expect(tester.takeException(),isNull);
    expect(find.text('Medical interview preparation'),findsOneWidget);
    s.learner.goal='Academic research';await tester.runAsync(() => s.save());await tester.pumpAndSettle();
    expect(tester.takeException(),isNull);expect(find.text('Academic research'),findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  }, timeout: const Timeout(Duration(seconds:60)));

}
