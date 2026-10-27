import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ilmigo/services.dart';

void main(){
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
