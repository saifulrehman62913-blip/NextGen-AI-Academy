import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_tts/flutter_tts.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'learning.dart';

class CloudService {
  static const origin = String.fromEnvironment('API_BASE_URL');
  CloudService({http.Client? client,String? baseUrl}):_client=client??http.Client(),baseUrl=baseUrl??origin;
  final http.Client _client;
  final String baseUrl;
  void close(){_sessionVersion++;token=null;userId=null;childProfileId=null;_refreshToken=null;_refreshing=null;_client.close();}
  String? token, userId;
  String? childProfileId;
  bool get isChildSession=>childProfileId!=null;
  String? _refreshToken;
  int _sessionVersion=0;
  bool _signingOut=false;
  Future<void>? _refreshing;
  bool get configured {final uri=Uri.tryParse(baseUrl);return uri!=null&&uri.host.isNotEmpty&&uri.userInfo.isEmpty&&uri.query.isEmpty&&uri.fragment.isEmpty&&(uri.scheme=='https'||uri.scheme=='http'&&['localhost','127.0.0.1','10.0.2.2'].contains(uri.host));}
  bool get signedIn => token != null;
  bool _sameSession(String? owner,int version)=>!_signingOut&&userId==owner&&_sessionVersion==version;
  Future<http.Response> _send(String path,String? body,String? accessToken) {
    if(!configured)throw Exception('Cloud is unavailable in this build. Local preview learning still works.');
    final uri=Uri.parse('${baseUrl.replaceAll(RegExp(r'/$'), '')}$path');
    final headers={'Content-Type':'application/json',if(accessToken!=null)'Authorization':'Bearer $accessToken'};
    return (body==null?_client.get(uri,headers:headers):_client.post(uri,headers:headers,body:body)).timeout(const Duration(seconds:30));
  }
  Map<String,dynamic> _decode(http.Response response){
    dynamic parsed;try{parsed=jsonDecode(response.body);}catch(_){throw Exception('Service unavailable. Please try again.');}
    if(parsed is! Map<String,dynamic>)throw Exception('Service unavailable. Please try again.');
    if(response.statusCode>=400)throw Exception(parsed['error'] is String?parsed['error']:'Service unavailable. Please try again.');
    return parsed;
  }
  Future<void> _rotate(String owner,String originalToken,int version) async {
    if(!_sameSession(owner,version))throw Exception('Account changed. Please try again.');
    if(token!=originalToken)return;
    if(_refreshing!=null){await _refreshing;return;}
    final refresh=_refreshToken;
    if(refresh==null)throw Exception('Your session has expired. Please sign in again.');
    final job=(() async {
      final response=await _send('/api/auth/refresh',jsonEncode({'refresh_token':refresh,'expectedUserId':owner}),null);
      final result=_decode(response);
      if(!_sameSession(owner,version))throw Exception('Account changed. Please try again.');
      if(result['userId']!=owner||result['access_token'] is! String||(result['access_token'] as String).isEmpty||result['refresh_token'] is! String||(result['refresh_token'] as String).isEmpty)throw Exception('The refreshed session could not be verified. Please sign in again.');
      token=result['access_token'] as String;_refreshToken=result['refresh_token'] as String;
    })();
    _refreshing=job;
    try{await job;}finally{if(identical(_refreshing,job))_refreshing=null;}
  }
  Future<Map<String, dynamic>> request(String path, [Map<String, dynamic>? data]) async {
    final publicAuth=path.startsWith('/api/auth/'),owner=userId,version=_sessionVersion,originalToken=token;
    if(_signingOut&&!publicAuth)throw Exception('Account is signing out. Please try again.');
    final body=data==null?null:jsonEncode(data);
    var response=await _send(path,body,publicAuth?null:originalToken);
    if(!publicAuth&&!_sameSession(owner,version))throw Exception('Account changed. Please try again.');
    if(!publicAuth&&response.statusCode==401&&owner!=null&&originalToken!=null&&_refreshToken!=null){
      await _rotate(owner,originalToken,version);
      if(!_sameSession(owner,version))throw Exception('Account changed. Please try again.');
      response=await _send(path,body,token);
    }
    if(!publicAuth&&!_sameSession(owner,version))throw Exception('Account changed. Please try again.');
    return _decode(response);
  }
  Future<void> sendCode(String email) async {await request('/api/auth/otp',{'email':email});}
  Future<void> verify(String email,String code,{String? expectedUserId}) async {
    final owner=userId,version=_sessionVersion;
    if(_signingOut)throw Exception('Wait for sign-out to finish before signing in.');
    final result=await request('/api/auth/verify',{'email':email,'token':code});
    if(!_sameSession(owner,version))throw Exception('Account changed. Please try again.');
    if(result['access_token'] is! String||(result['access_token'] as String).isEmpty||result['userId'] is! String||(result['userId'] as String).isEmpty)throw Exception('Invalid sign-in response.');
    if(expectedUserId!=null&&result['userId']!=expectedUserId)throw Exception('Verify the email for this family account. A different account cannot reset its PIN.');
    _sessionVersion++;_refreshing=null;childProfileId=null;token=result['access_token'] as String;userId=result['userId'] as String;
    _refreshToken=result['refresh_token'] is String?result['refresh_token'] as String:null;
  }
  Future<void> enterChild(LearningStore store,Learner child,{required bool consent}) async {
    if(isChildSession||!signedIn||!child.isChild||!consent)throw Exception('A signed-in parent must consent to child cloud access.');
    final owner=userId,version=_sessionVersion;
    await sync(store,consentedChildId:child.id);
    if(!_sameSession(owner,version)||store.ownerId!=owner||child.cloudId==null)throw Exception('Account changed. Please try again.');
    final result=await request('/api/child-session',{'profileId':child.cloudId,'consent':true,'consentVersion':'child-cloud-v1'});
    if(!_sameSession(owner,version)||result['userId']!=owner||result['scope']!='child'||result['childProfileId']!=child.cloudId||result['access_token'] is! String||!(result['access_token'] as String).startsWith('ilmigo_child_'))throw Exception('Child session could not be verified.');
    _sessionVersion++;_refreshing=null;_refreshToken=null;token=result['access_token'] as String;childProfileId=child.cloudId;
  }
  Future<void> sync(LearningStore store,{bool restore=false,String? consentedChildId}) async {
    final owner=userId;if(owner==null || store.ownerId!=owner)throw Exception('Open your own account space before syncing.');
    final data = await request('/api/sync', {'profiles': restore?<Map<String,dynamic>>[]:store.profiles.where((p)=>isChildSession?p.cloudId==childProfileId&&p.isChild:!p.isChild||p.cloudId!=null||p.id==consentedChildId).map((p) => {'id': p.cloudId, 'localId': p.id, 'name': p.name, 'kind': p.kind, 'language': p.language, 'goal': p.goal, 'completed': p.completed, 'days':p.days,if(p.id==consentedChildId)'childConsent':true,if(p.id==consentedChildId)'childConsentVersion':'child-cloud-v1'}).toList()});
    if(userId!=owner || store.ownerId!=owner)return;store.mergeCloud(data['profiles'] as List,restore:restore&&!isChildSession);if(isChildSession){final bound=store.profiles.where((p)=>p.cloudId==childProfileId&&p.isChild).toList();if(bound.isEmpty)throw Exception('The child profile could not be restored. Ask a parent to sign in.');store.active=bound.first.id;}if(restore)store.onboarded=true;await store.save();
  }
  Future<void> signOut(LearningStore store,{bool eraseLocal=false}) async {
    if(_signingOut)return;_signingOut=true;
    try{
      if(eraseLocal){await store.deleteAccountStore();}else{await store.switchAccount(null);}
      _sessionVersion++;token=null;userId=null;childProfileId=null;_refreshToken=null;_refreshing=null;
    }finally{_signingOut=false;}
  }
}

class VoiceService {
  VoiceService({FlutterTts? engine}):tts=engine??FlutterTts();
  final FlutterTts tts;
  int _generation=0;
  Future<void> speak(String text, String language) async {
    final generation=++_generation;
    final locale = speechLocale(language);
    final available = await tts.isLanguageAvailable(locale);
    if(generation!=_generation)return;
    if (available != true && available != 1) throw Exception('A $locale device voice is not installed. Use the written transliteration for now.');
    await tts.setLanguage(locale);if(generation!=_generation)return;
    await tts.setSpeechRate(0.42);if(generation!=_generation)return;
    await tts.speak(text);
  }
  Future<void> stop() async { _generation++;try{await tts.stop();}catch(_){/* Best-effort cleanup when the platform voice service is unavailable. */} }
}

// Production store bridge. No simulated purchases or client-only entitlements.
// Enable only after reviewed paid content and store products have been approved.
class BillingService {
  static const enabled = bool.fromEnvironment('ENABLE_PURCHASES', defaultValue: false);
  static const requiredBuild = bool.fromEnvironment('SUBSCRIPTIONS_REQUIRED', defaultValue: false);
  String? _accountId;
  static const androidKey = String.fromEnvironment('REVENUECAT_ANDROID_KEY');
  static const appleKey = String.fromEnvironment('REVENUECAT_IOS_KEY');
  Future<void> configure(String accountId) async {
    final key = Platform.isIOS ? appleKey : androidKey;
    if (!enabled || key.isEmpty) throw Exception('Purchases are not enabled in this build.');
    if(_accountId==accountId)return;
    if(_accountId==null){await Purchases.configure(PurchasesConfiguration(key)..appUserID = accountId);}else{await Purchases.logIn(accountId);}
    _accountId=accountId;
  }
  Future<Offerings> offerings() => Purchases.getOfferings();
  Future<CustomerInfo> purchase(Package package) => Purchases.purchasePackage(package);
  Future<CustomerInfo> restore() => Purchases.restorePurchases();
}
