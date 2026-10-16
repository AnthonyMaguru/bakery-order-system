import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'config.dart';

/// The server answered, but said no. [message] is written for people, so show it as it is.
class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => message;
}

/// The request never got an answer: no connection, or it took too long.
/// Orders that hit this are saved on the phone and sent later (see features/outbox).
class NetworkException implements Exception {
  const NetworkException();

  @override
  String toString() => "You're offline or the connection is too weak right now.";
}

/// Every call to the backend goes through here. See docs/api.md for endpoints.
class ApiClient {
  ApiClient({http.Client? client, this.timeout = const Duration(seconds: 20)}) : _client = client ?? http.Client();

  final http.Client _client;
  final Duration timeout;

  Map<String, String> _headers() {
    // TODO(mobile lead): once Firebase Auth is added, send the ID token instead:
    //   'Authorization': 'Bearer ${await FirebaseAuth.instance.currentUser!.getIdToken()}'
    return {
      'Content-Type': 'application/json',
      if (AppConfig.devUser.isNotEmpty) 'x-dev-user': AppConfig.devUser,
    };
  }

  Uri _uri(String path) => Uri.parse('${AppConfig.apiUrl}$path');

  Future<dynamic> get(String path) => _send(() => _client.get(_uri(path), headers: _headers()));

  Future<dynamic> post(String path, [Object? body]) =>
      _send(() => _client.post(_uri(path), headers: _headers(), body: jsonEncode(body ?? {})));

  Future<dynamic> patch(String path, Object body) =>
      _send(() => _client.patch(_uri(path), headers: _headers(), body: jsonEncode(body)));

  Future<dynamic> _send(Future<http.Response> Function() request) async {
    final http.Response res;
    try {
      res = await request().timeout(timeout);
    } on SocketException {
      throw const NetworkException();
    } on TimeoutException {
      throw const NetworkException();
    } on http.ClientException {
      throw const NetworkException();
    }
    final body = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, (body is Map ? body['error'] as String? : null) ?? 'Something went wrong');
    }
    return body;
  }
}

ApiClient api = ApiClient();
