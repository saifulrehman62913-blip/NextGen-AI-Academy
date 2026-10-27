import 'dart:convert';
import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ilmigo/services.dart';
import 'package:ilmigo/learning.dart';
import 'package:flutter_tts/flutter_tts.dart';

class DelayedVoice extends Fake implements FlutterTts {
  final checks=<Completer<dynamic>>[];
  final spoken=<String>[];
  @override Future<dynamic> isLanguageAvailable(String language){final result=Completer<dynamic>();checks.add(result);return result.future;}
  @override Future<dynamic> setLanguage(String language) async=>1;
  @override Future<dynamic> setSpeechRate(double rate) async=>1;
  @override Future<dynamic> speak(String text,{bool focus=false}) async {spoken.add(text);return 1;}
  @override Future<dynamic> stop() async=>1;
}

class FailingSignOutStore extends LearningStore {
  @override Future<void> switchAccount(String? account,{bool persistCurrent=true}) async {throw StateError('Storage unavailable');}
}

void main(){
  test('stopping voice prevents a delayed playback from starting after leaving a screen',() async {
    final engine=DelayedVoice(),voice=VoiceService(engine:engine);
    final pending=voice.speak('old phrase','en');await voice.stop();engine.checks.single.complete(true);await pending;expect(engine.spoken,isEmpty);
  });
  test('a newer voice request supersedes an older pending phrase',() async {
    final engine=DelayedVoice(),voice=VoiceService(engine:engine);
    final old=voice.speak('old phrase','en'),current=voice.speak('current phrase','ur');
    engine.checks[1].complete(true);await current;engine.checks[0].complete(true);await old;expect(engine.spoken,['current phrase']);
  });
  test('concurrent expired requests rotate once and replay the original request',() async {
    final started=Completer<void>(),release=Completer<void>();int refreshes=0;final bodies=<String>[];
    final service=CloudService(baseUrl:'https://test.invalid',client:MockClient((request) async {
      if(request.url.path=='/api/auth/verify')return http.Response(jsonEncode({'access_token':'old','refresh_token':'refresh-A','userId':'A'}),200);
      if(request.url.path=='/api/auth/refresh'){refreshes++;expect(request.headers['Authorization'],isNull);expect(jsonDecode(request.body)['expectedUserId'],'A');started.complete();await release.future;return http.Response(jsonEncode({'access_token':'new','refresh_token':'rotated-A','userId':'A'}),200);}
      if(request.body.isNotEmpty)bodies.add(request.body);
      return request.headers['Authorization']=='Bearer old'?http.Response('{"error":"Expired"}',401):http.Response('{"ok":true}',200);
    }));addTearDown(service.close);
    await service.verify('a@example.test','123456');final data=<String,dynamic>{'name':'original'};
    final first=service.request('/api/sync',data),second=service.request('/api/entitlements');data['name']='edited';
    await started.future;release.complete();await Future.wait([first,second]);expect(refreshes,1);expect(service.token,'new');expect(bodies.map((v)=>jsonDecode(v)['name']),['original','original']);
  });
  test('late refresh cannot replace a newly verified different account',() async {
    final started=Completer<void>(),release=Completer<void>();
    final service=CloudService(baseUrl:'https://test.invalid',client:MockClient((request) async {
      if(request.url.path=='/api/auth/verify'){final b=jsonDecode(request.body)['email']=='b@example.test';return http.Response(jsonEncode({'access_token':b?'token-B':'token-A','refresh_token':b?'refresh-B':'refresh-A','userId':b?'B':'A'}),200);}
      if(request.url.path=='/api/auth/refresh'){started.complete();await release.future;return http.Response('{"access_token":"late-A","refresh_token":"late-refresh-A","userId":"A"}',200);}
      return http.Response('{"error":"Expired"}',401);
    }));addTearDown(service.close);
    await service.verify('a@example.test','123456');final pending=service.request('/api/entitlements');await started.future;
    await service.verify('b@example.test','123456');final assertion=expectLater(pending,throwsException);release.complete();await assertion;expect(service.userId,'B');expect(service.token,'token-B');
  });
  test('disposing a client invalidates an in-flight refresh',() async {
    final started=Completer<void>(),release=Completer<void>();
    final service=CloudService(baseUrl:'https://test.invalid',client:MockClient((request) async {
      if(request.url.path=='/api/auth/verify')return http.Response('{"access_token":"old","refresh_token":"refresh-A","userId":"A"}',200);
      if(request.url.path=='/api/auth/refresh'){started.complete();await release.future;return http.Response('{"access_token":"late","refresh_token":"late-refresh","userId":"A"}',200);}
      return http.Response('{"error":"Expired"}',401);
    }));
    await service.verify('a@example.test','123456');final pending=service.request('/api/entitlements');await started.future;
    final assertion=expectLater(pending,throwsException);service.close();release.complete();await assertion;expect(service.token,isNull);expect(service.userId,isNull);
  });
  test('wrong-owner refresh and expired refresh fail without replacing credentials',() async {
    for(final wrongOwner in [true,false]){
      int refreshes=0;
      final service=CloudService(baseUrl:'https://test.invalid',client:MockClient((request) async {
        if(request.url.path=='/api/auth/verify')return http.Response('{"access_token":"old","refresh_token":"refresh-A","userId":"A"}',200);
        if(request.url.path=='/api/auth/refresh'){refreshes++;return wrongOwner?http.Response('{"access_token":"B","refresh_token":"refresh-B","userId":"B"}',200):http.Response('{"error":"Sign in again"}',401);}
        return http.Response('{"error":"Expired"}',401);
      }));addTearDown(service.close);
      await service.verify('a@example.test','123456');await expectLater(service.request('/api/sync',{}),throwsException);expect(refreshes,1);expect(service.userId,'A');expect(service.token,'old');
    }
  });
  test('service failures do not rotate sessions and unreadable errors stay readable',() async {
    int refreshes=0;
    final service=CloudService(baseUrl:'https://test.invalid',client:MockClient((request) async {
      if(request.url.path=='/api/auth/verify')return http.Response('{"access_token":"old","refresh_token":"refresh-A","userId":"A"}',200);
      if(request.url.path=='/api/auth/refresh')refreshes++;
      return http.Response('<html>Gateway unavailable</html>',502);
    }));addTearDown(service.close);await service.verify('a@example.test','123456');
    await expectLater(service.request('/api/speaking',{}),throwsA(predicate((e)=>e.toString().contains('Service unavailable'))));expect(refreshes,0);expect(service.token,'old');
  });
  test('failed local sign-out preserves the verified session and releases the sign-out lock',() async {
    final service=CloudService(baseUrl:'https://test.invalid',client:MockClient((request) async=>http.Response(request.url.path=='/api/auth/verify'?'{"access_token":"old","refresh_token":"refresh-A","userId":"A"}':'{"plus":false}',200)));
    addTearDown(service.close);await service.verify('a@example.test','123456');await expectLater(service.signOut(FailingSignOutStore()),throwsStateError);expect(service.userId,'A');expect(service.token,'old');expect((await service.request('/api/entitlements'))['plus'],false);
  });
  test('unconfigured beta cannot open a real store purchase session',() async {
    expect(BillingService.enabled,false);
    await expectLater(BillingService().configure('verified-owner'),throwsException);
  });
  test('parent recovery rejects another verified user without replacing the session',() async {
    final service=CloudService(baseUrl:'https://test.invalid',client:MockClient((request) async=>http.Response(jsonEncode({'access_token':'token-B','userId':'B'}),200)));
    addTearDown(service.close);service.token='token-A';service.userId='A';
    await expectLater(service.verify('parent@example.test','123456',expectedUserId:'A'),throwsException);
    expect(service.userId,'A');expect(service.token,'token-A');
  });
  test('same-account email proof replaces only the expected session',() async {
    final service=CloudService(baseUrl:'https://test.invalid',client:MockClient((request) async=>http.Response(jsonEncode({'access_token':'new-token-A','userId':'A'}),200)));
    addTearDown(service.close);await service.verify('parent@example.test','123456',expectedUserId:'A');expect(service.userId,'A');expect(service.token,'new-token-A');
  });
  test('local HTTP allowance does not accept a lookalike remote host',(){
    final local=CloudService(baseUrl:'http://localhost:3000'),remote=CloudService(baseUrl:'http://localhost.attacker.invalid'),secure=CloudService(baseUrl:'https://test.invalid');
    addTearDown(local.close);addTearDown(remote.close);addTearDown(secure.close);expect(local.configured,true);expect(remote.configured,false);expect(secure.configured,true);
  });
}
