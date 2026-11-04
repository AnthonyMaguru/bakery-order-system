import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/firebase_setup.dart';
import '../../models/order.dart';

/// An order saved on the phone because it couldn't be sent yet.
class OutboxItem {
  OutboxItem({
    required this.clientRequestId,
    required this.body,
    required this.title,
    required this.bakeryName,
    required this.savedAt,
    this.attachments = const [],
    this.error,
  });

  /// Sent with the order, so the backend never saves the same order twice.
  final String clientRequestId;
  final Map<String, dynamic> body;
  final String title;
  final String bakeryName;
  final DateTime savedAt;
  final List<OutboxAttachment> attachments;

  /// Set when the bakery refused it, e.g. the day filled up while the phone was offline.
  final String? error;

  OutboxItem withError(String? message) =>
      OutboxItem(
        clientRequestId: clientRequestId,
        body: body,
        title: title,
        bakeryName: bakeryName,
        savedAt: savedAt,
        attachments: attachments,
        error: message,
      );

  Map<String, dynamic> toJson() => {
        'clientRequestId': clientRequestId,
        'body': body,
        'title': title,
        'bakeryName': bakeryName,
        'savedAt': savedAt.toIso8601String(),
        'attachments': attachments.map((attachment) => attachment.toJson()).toList(),
        'error': error,
      };

  factory OutboxItem.fromJson(Map<String, dynamic> json) => OutboxItem(
        clientRequestId: json['clientRequestId'] as String,
        body: (json['body'] as Map).cast<String, dynamic>(),
        title: json['title'] as String,
        bakeryName: json['bakeryName'] as String,
        savedAt: DateTime.parse(json['savedAt'] as String),
        attachments: ((json['attachments'] as List?) ?? const [])
            .map((entry) => OutboxAttachment.fromJson((entry as Map).cast<String, dynamic>()))
            .toList(),
        error: json['error'] as String?,
      );
}

class OutboxAttachment {
  const OutboxAttachment({required this.field, required this.bytes, required this.contentType});

  final String field;
  final Uint8List bytes;
  final String contentType;

  Map<String, dynamic> toJson() => {
        'field': field,
        'bytes': base64Encode(bytes),
        'contentType': contentType,
      };

  factory OutboxAttachment.fromJson(Map<String, dynamic> json) => OutboxAttachment(
        field: json['field'] as String,
        bytes: base64Decode(json['bytes'] as String),
        contentType: json['contentType'] as String,
      );
}

sealed class SubmitResult {}

class Sent extends SubmitResult {
  Sent(this.order);
  final Order order;
}

class Queued extends SubmitResult {
  Queued(this.item);
  final OutboxItem item;
}

/// A random version 4 UUID, made on the phone so it exists before any connection.
String newRequestId([Random? random]) {
  final r = random ?? Random.secure();
  final bytes = List<int>.generate(16, (_) => r.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

/// Orders waiting to be sent. Retries when the app opens, comes back to the
/// foreground, and every 30 seconds while something is waiting.
class Outbox extends ChangeNotifier {
  Outbox._();

  static final instance = Outbox._();
  static const _keyPrefix = 'outbox:';
  static const _initialRetryDelay = Duration(seconds: 30);
  static const _maxRetryDelay = Duration(minutes: 5);

  List<OutboxItem> _items = [];
  Timer? _timer;
  bool _flushing = false;
  bool _started = false;
  String? _accountId;
  String? _testingAccountId;
  StreamSubscription<User?>? _authSubscription;
  Duration _retryDelay = _initialRetryDelay;

  List<OutboxItem> get items => List.unmodifiable(_items);
  List<OutboxItem> get waiting => _items.where((i) => i.error == null).toList();
  Duration get retryDelay => _retryDelay;

  String? _currentAccountId() {
    if (_testingAccountId != null) return _testingAccountId;
    if (firebaseReady) return FirebaseAuth.instance.currentUser?.uid;
    return AppConfig.devUser.isEmpty ? null : AppConfig.devUser;
  }

  String _storageKey(String accountId) => '$_keyPrefix$accountId';

  Future<void> start() async {
    if (_started) return;
    _started = true;
    _retryDelay = _initialRetryDelay;
    if (firebaseReady) {
      _authSubscription = FirebaseAuth.instance.authStateChanges().listen((user) {
        _activateAccount(user?.uid);
      });
    }
    await _activateAccount(_currentAccountId(), force: true);
  }

  Future<void> _activateAccount(String? accountId, {bool force = false}) async {
    if (!force && _accountId == accountId) return;
    _timer?.cancel();
    _timer = null;
    _accountId = accountId;
    _items = [];
    _retryDelay = _initialRetryDelay;
    if (accountId == null) {
      notifyListeners();
      return;
    }
    final prefs = await SharedPreferences.getInstance();
    if (_accountId != accountId) return;
    final saved = prefs.getString(_storageKey(accountId));
    if (saved != null) {
      _items = (jsonDecode(saved) as List).map((e) => OutboxItem.fromJson(e as Map<String, dynamic>)).toList();
    }
    notifyListeners();
    await flush();
  }

  void _scheduleRetry() {
    _timer?.cancel();
    if (waiting.isEmpty) {
      _retryDelay = _initialRetryDelay;
      _timer = null;
      return;
    }
    _timer = Timer(_retryDelay, () => flush());
  }

  Future<void> _save() async {
    final accountId = _accountId;
    if (accountId == null) throw StateError('A signed-in account is required to save an offline order.');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey(accountId), jsonEncode(_items.map((i) => i.toJson()).toList()));
    notifyListeners();
    _scheduleRetry();
  }

  /// Sends the order now, or keeps it when there's no connection.
  /// The bakery refusing it (an [ApiException]) is thrown, so the form can show why.
  Future<SubmitResult> submit(
    Map<String, dynamic> body, {
    required String title,
    required String bakeryName,
    List<OutboxAttachment> attachments = const [],
  }) async {
    final accountId = _currentAccountId();
    if (accountId != _accountId) await _activateAccount(accountId);
    if (_accountId == null) throw StateError('A signed-in account is required to place an order.');
    final id = newRequestId();
    final item = OutboxItem(
      clientRequestId: id,
      body: {...body, 'clientRequestId': id},
      title: title,
      bakeryName: bakeryName,
      savedAt: DateTime.now(),
      attachments: attachments,
    );
    _items = [..._items, item];
    await _save();
    try {
      final uploaded = await _uploadAttachments(item);
      final json = await api.post('/orders', uploaded.body);
      _items = _items.where((queued) => queued.clientRequestId != id).toList();
      await _save();
      return Sent(Order.fromJson(json as Map<String, dynamic>));
    } on NetworkException {
      return Queued(_items.firstWhere((queued) => queued.clientRequestId == id));
    } on ApiException {
      _items = _items.where((queued) => queued.clientRequestId != id).toList();
      await _save();
      rethrow;
    }
  }

  Future<OutboxItem> _uploadAttachments(OutboxItem item) async {
    var current = item;
    while (current.attachments.isNotEmpty) {
      final attachment = current.attachments.first;
      final response = await api.postBytes('/uploads', attachment.bytes, attachment.contentType) as Map<String, dynamic>;
      final nextBody = Map<String, dynamic>.from(current.body);
      if (attachment.field == 'designImageUrl') {
        nextBody[attachment.field] = response['url'] as String;
      } else {
        nextBody['inspirationImageUrls'] = [
          ...((nextBody['inspirationImageUrls'] as List?) ?? const []),
          response['url'] as String,
        ];
      }
      current = OutboxItem(
        clientRequestId: current.clientRequestId,
        body: nextBody,
        title: current.title,
        bakeryName: current.bakeryName,
        savedAt: current.savedAt,
        attachments: current.attachments.skip(1).toList(),
      );
      _items = [
        for (final queued in _items)
          if (queued.clientRequestId == current.clientRequestId) current else queued,
      ];
      await _save();
    }
    return current;
  }

  /// Tries every waiting order. Returns how many were sent.
  Future<int> flush() async {
    if (_flushing || _accountId == null || waiting.isEmpty) return 0;
    _flushing = true;
    var sent = 0;
    try {
      for (final item in waiting) {
        try {
          final uploaded = await _uploadAttachments(item);
          await api.post('/orders', uploaded.body);
          _items = _items.where((i) => i.clientRequestId != item.clientRequestId).toList();
          sent++;
          _retryDelay = _initialRetryDelay;
        } on ApiException catch (e) {
          _items = [
            for (final queued in _items)
              queued.clientRequestId == item.clientRequestId ? queued.withError(e.message) : queued,
          ];
        } on NetworkException {
          final nextDelay = _retryDelay < _maxRetryDelay ? _retryDelay * 2 : _maxRetryDelay;
          _retryDelay = nextDelay;
          break;
        }
      }
    } finally {
      _flushing = false;
      await _save();
    }
    return sent;
  }

  Future<void> remove(String clientRequestId) async {
    _items = _items.where((i) => i.clientRequestId != clientRequestId).toList();
    await _save();
  }

  Future<void> retry(String clientRequestId) async {
    _items = [
      for (final item in _items)
        if (item.clientRequestId == clientRequestId) item.withError(null) else item,
    ];
    await _save();
    await flush();
  }

  @visibleForTesting
  void setAccountForTesting(String accountId) {
    _testingAccountId = accountId;
    _accountId = accountId;
  }

  @visibleForTesting
  void reset() {
    _items = [];
    _retryDelay = _initialRetryDelay;
    _timer?.cancel();
    _timer = null;
    _accountId = null;
    _testingAccountId = null;
    _started = false;
    unawaited(_authSubscription?.cancel() ?? Future<void>.value());
    _authSubscription = null;
  }
}
