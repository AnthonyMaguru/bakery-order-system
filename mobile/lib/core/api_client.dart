import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => message;
}

/// Every call to the backend goes through here. See docs/api.md for endpoints.
class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<Map<String, String>> _headers() async {
    // TODO(mobile lead): once Firebase Auth is added, send the ID token instead:
    //   'Authorization': 'Bearer ${await FirebaseAuth.instance.currentUser!.getIdToken()}'
    return {
      'Content-Type': 'application/json',
      if (AppConfig.devUser.isNotEmpty) 'x-dev-user': AppConfig.devUser,
    };
  }

  Future<dynamic> get(String path) async {
    final res = await _client.get(Uri.parse('${AppConfig.apiUrl}$path'), headers: await _headers());
    return _decode(res);
  }

  Future<dynamic> post(String path, Object body) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiUrl}$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, (body is Map ? body['error'] : null) ?? 'Request failed');
    }
    return body;
  }
}

final api = ApiClient();
