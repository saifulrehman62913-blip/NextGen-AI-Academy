import 'dart:convert';
import 'dart:math';
import 'package:cryptography/cryptography.dart';
import 'learning.dart';

class ParentGate {
  ParentGate(this.store);
  final LearningStore store;
  final algorithm=Pbkdf2(macAlgorithm:Hmac.sha256(),iterations:100000,bits:256);
  Future<List<int>> derive(String pin,List<int> salt) async => (await algorithm.deriveKey(secretKey:SecretKey(utf8.encode(pin)),nonce:salt)).extractBytes();
  Future<void> setup(String pin) async {
    if(!RegExp(r'^\d{6,12}$').hasMatch(pin))throw Exception('Use a parent PIN of 6–12 digits.');
    final r=Random.secure();final salt=List.generate(16,(_)=>r.nextInt(256));
    await store.saveParentCredential(jsonEncode({'salt':salt,'hash':await derive(pin,salt),'failures':0,'until':0}));
  }
  Future<bool> verify(String pin) async {
    final raw=jsonDecode(store.parentCredential ?? 'null');
    if(raw is! Map)throw Exception('A parent must set a PIN on this device first.');
    if(DateTime.now().millisecondsSinceEpoch<(raw['until'] as int? ?? 0))throw Exception('Too many attempts. Try again in a minute.');
    final actual=await derive(pin,List<int>.from(raw['salt'] as List));final expected=List<int>.from(raw['hash'] as List);int difference=0;
    for(int i=0;i<actual.length;i++){difference|=actual[i]^expected[i];}
    final ok=difference==0;int failures=ok?0:(raw['failures'] as int? ?? 0)+1;int until=0;
    if(failures>=5){until=DateTime.now().add(const Duration(minutes:1)).millisecondsSinceEpoch;failures=0;}
    raw['failures']=failures;raw['until']=until;await store.saveParentCredential(jsonEncode(raw));return ok;
  }
}
