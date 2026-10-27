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
  void close()=>_client.close();
  String? token, userId;
  bool get configured {final uri=Uri.tryParse(baseUrl);return uri!=null&&uri.host.isNotEmpty&&uri.userInfo.isEmpty&&(uri.scheme=='https'||uri.scheme=='http'&&['localhost','127.0.0.1','10.0.2.2'].contains(uri.host));}
  bool get signedIn => token != null;
  Future<Map<String, dynamic>> request(String path, [Map<String, dynamic>? data]) async {
    if (!configured) throw Exception('Cloud is not connected. Set API_BASE_URL to your HTTPS server. Local learning still works.');
    final uri = Uri.parse('${baseUrl.replaceAll(RegExp(r'/$'), '')}$path');
    final headers = {'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token'};
    final response = await (data == null ? _client.get(uri, headers: headers) : _client.post(uri, headers: headers, body: jsonEncode(data))).timeout(const Duration(seconds: 30));
    final result = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) throw Exception(result['error'] ?? 'Service unavailable.');
    return result;
  }
  Future<void> sendCode(String email) async { await request('/api/auth/otp', {'email': email}); }
  Future<void> verify(String email,String code,{String? expectedUserId}) async {final result=await request('/api/auth/verify',{'email':email,'token':code});if(result['access_token'] is! String || result['userId'] is! String)throw Exception('Invalid sign-in response.');if(expectedUserId!=null && result['userId']!=expectedUserId)throw Exception('Verify the email for this family account. A different account cannot reset its PIN.');token=result['access_token'] as String;userId=result['userId'] as String;}
  Future<void> sync(LearningStore store,{bool restore=false}) async {
    final owner=userId;if(owner==null || store.ownerId!=owner)throw Exception('Open your own account space before syncing.');
    final data = await request('/api/sync', {'profiles': restore?<Map<String,dynamic>>[]:store.profiles.map((p) => {'id': p.cloudId, 'localId': p.id, 'name': p.name, 'kind': p.kind, 'language': p.language, 'goal': p.goal, 'completed': p.completed, 'days':p.days}).toList()});
    if(userId!=owner || store.ownerId!=owner)return;store.mergeCloud(data['profiles'] as List,restore:restore);if(restore)store.onboarded=true;await store.save();
  }
  Future<void> signOut(LearningStore store,{bool eraseLocal=false}) async {if(eraseLocal){await store.deleteAccountStore();}else{await store.switchAccount(null);}token=null;userId=null;}
}

class VoiceService {
  final FlutterTts tts = FlutterTts();
  Future<void> speak(String text, String language) async {
    final locale = speechLocale(language);
    final available = await tts.isLanguageAvailable(locale);
    if (available != true && available != 1) throw Exception('A $locale device voice is not installed. Use the written transliteration for now.');
    await tts.setLanguage(locale); await tts.setSpeechRate(0.42); await tts.speak(text);
  }
  Future<void> stop() async { try{await tts.stop();}catch(_){/* Best-effort cleanup when the platform voice service is unavailable. */} }
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
