import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ilmigo/main.dart';
import 'package:ilmigo/learning.dart';
import 'package:ilmigo/services.dart';

class DeferredPracticeCloud extends CloudService {
  DeferredPracticeCloud():super(baseUrl:'https://test.invalid') {token='test-access';userId='A';}
  final syncStarted=Completer<void>(),releaseSync=Completer<void>();
  final sent=<Map<String,dynamic>>[];
  @override Future<void> sync(LearningStore store,{bool restore=false,String? consentedChildId}) async {
    if(!syncStarted.isCompleted)syncStarted.complete();
    await releaseSync.future;
  }
  @override Future<Map<String,dynamic>> request(String path,[Map<String,dynamic>? data]) async {
    sent.add({'path':path,...?data});return {'feedback':'Fixture feedback'};
  }
}

void main(){
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(()=>SharedPreferences.setMockInitialValues({}));
  testWidgets('practice phrase uses each course reading direction, including non-Urdu RTL languages',(tester) async {
    final store=LearningStore();await tester.runAsync(()=>store.load());
    final cloud=CloudService();addTearDown(cloud.close);
    for(final language in store.catalog['languages'] as List){
      store.learner.language=language['id'] as String;
      final target=store.nextLesson!['speaking'] as String;
      await tester.pumpWidget(MaterialApp(home:Scaffold(body:PracticeView(key:ValueKey(language['id']),store:store,cloud:cloud,voice:VoiceService(),onLogin:() async {}))));
      final phrase=tester.widget<Text>(find.text(target).first);
      expect(phrase.textDirection,language['direction']=='rtl'?TextDirection.rtl:TextDirection.ltr,reason:language['id'] as String);
      expect(tester.takeException(),isNull);
    }
    await tester.pumpWidget(const SizedBox());
  },timeout:const Timeout(Duration(seconds:60)));
  testWidgets('assessment radio groups keep every question independently selected',(tester) async {
    final store=LearningStore();await tester.runAsync(()=>store.load());
    final lesson=store.nextLesson!,questions=lessonQuestions(lesson),voice=VoiceService();
    store.learner.sessions[lesson['id'] as String]={'index':4,'seconds':0,'answers':<String>[]};
    await tester.pumpWidget(MaterialApp(home:LessonScreen(store:store,lesson:lesson,voice:voice)));
    await tester.pump();
    for(var j=0;j<questions.length;j++){
      final option=find.byKey(ValueKey('answer-$j-${questions[j]['answer']}'));
      await tester.ensureVisible(option);await tester.tap(option);await tester.pump();
      for(var i=0;i<=j;i++){
        final group=tester.widget<RadioGroup<String>>(find.byKey(ValueKey('assessment-$i')));
        expect(group.groupValue,questions[i]['answer']);
      }
    }
    expect(tester.takeException(),isNull);
    await tester.pumpWidget(const SizedBox());
  },timeout:const Timeout(Duration(seconds:60)));
  testWidgets('leaving speaking studio during sync prevents a late AI request',(tester) async {
    final store=LearningStore();await tester.runAsync(()=>store.load());await tester.runAsync(()=>store.switchAccount('A'));
    final cloud=DeferredPracticeCloud();addTearDown(cloud.close);
    await tester.pumpWidget(MaterialApp(home:Scaffold(body:PracticeView(store:store,cloud:cloud,voice:VoiceService(),onLogin:() async {}))));
    await tester.ensureVisible(find.byType(TextField));await tester.enterText(find.byType(TextField),'Original answer');
    final ask=find.widgetWithText(FilledButton,'Ask ILMIGO');await tester.ensureVisible(ask);await tester.tap(ask);await tester.pump();
    expect(cloud.syncStarted.isCompleted,true);
    await tester.pumpWidget(const SizedBox());cloud.releaseSync.complete();await tester.pump();
    expect(cloud.sent,isEmpty);expect(tester.takeException(),isNull);
  },timeout:const Timeout(Duration(seconds:60)));
  testWidgets('AI feedback snapshots the submitted phrase while sync is pending',(tester) async {
    final store=LearningStore();await tester.runAsync(()=>store.load());await tester.runAsync(()=>store.switchAccount('A'));
    final cloud=DeferredPracticeCloud();addTearDown(cloud.close);
    await tester.pumpWidget(MaterialApp(home:Scaffold(body:PracticeView(store:store,cloud:cloud,voice:VoiceService(),onLogin:() async {}))));
    await tester.ensureVisible(find.byType(TextField));await tester.enterText(find.byType(TextField),'Original answer');
    final ask=find.widgetWithText(FilledButton,'Ask ILMIGO');await tester.ensureVisible(ask);await tester.tap(ask);await tester.pump();
    expect(cloud.syncStarted.isCompleted,true);
    await tester.ensureVisible(find.byType(TextField));await tester.enterText(find.byType(TextField),'Edited while syncing');
    cloud.releaseSync.complete();await tester.pump();await tester.pump();
    expect(cloud.sent.single['transcript'],'Original answer');expect(cloud.sent.single['path'],'/api/speaking');
    expect(tester.takeException(),isNull);await tester.pumpWidget(const SizedBox());
  },timeout:const Timeout(Duration(seconds:60)));
  testWidgets('changing active learner during sync prevents a request for the new profile',(tester) async {
    final store=LearningStore();await tester.runAsync(()=>store.load());await tester.runAsync(()=>store.switchAccount('A'));
    final cloud=DeferredPracticeCloud();addTearDown(cloud.close);
    store.profiles.add(Learner(id:'other',name:'Other learner',kind:'child'));
    await tester.pumpWidget(MaterialApp(home:Scaffold(body:PracticeView(store:store,cloud:cloud,voice:VoiceService(),onLogin:() async {}))));
    await tester.ensureVisible(find.byType(TextField));await tester.enterText(find.byType(TextField),'Parent phrase');
    final ask=find.widgetWithText(FilledButton,'Ask ILMIGO');await tester.ensureVisible(ask);await tester.tap(ask);await tester.pump();
    expect(cloud.syncStarted.isCompleted,true);store.active='other';cloud.releaseSync.complete();await tester.pump();await tester.pump();
    expect(cloud.sent,isEmpty);expect(tester.takeException(),isNull);await tester.pumpWidget(const SizedBox());
  },timeout:const Timeout(Duration(seconds:60)));
}
