import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/firebase_setup.dart';
import '../orders/order_detail_screen.dart';

/// Lets the app open screens and show messages from outside the widget tree.
final navigatorKey = GlobalKey<NavigatorState>();
final messengerKey = GlobalKey<ScaffoldMessengerState>();

enum PushStatus { unavailable, notDetermined, enabled, denied }

/// Push notifications: "Your quote is ready", "Your cake is ready to collect".
/// The backend sends them to every phone registered for the customer.
class Push {
  Push._();

  static final instance = Push._();
  StreamSubscription<String>? _refresh;
  bool _listening = false;

  Future<PushStatus> status() async {
    if (!firebaseReady) return PushStatus.unavailable;
    final settings = await FirebaseMessaging.instance.getNotificationSettings();
    return switch (settings.authorizationStatus) {
      AuthorizationStatus.authorized ||
      AuthorizationStatus.provisional => PushStatus.enabled,
      AuthorizationStatus.denied => PushStatus.denied,
      _ => PushStatus.notDetermined,
    };
  }

  Future<PushStatus> requestPermission() async {
    if (!firebaseReady) return PushStatus.unavailable;
    final settings = await FirebaseMessaging.instance.requestPermission();
    return switch (settings.authorizationStatus) {
      AuthorizationStatus.authorized ||
      AuthorizationStatus.provisional => PushStatus.enabled,
      AuthorizationStatus.denied => PushStatus.denied,
      _ => PushStatus.notDetermined,
    };
  }

  /// Call after sign in: asks for permission, then registers this phone.
  Future<void> register() async {
    if (!firebaseReady || FirebaseAuth.instance.currentUser == null) return;
    try {
      final settings = await FirebaseMessaging.instance.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        return;
      }
      // firebase_messaging 17 deprecates tokens in favour of register()/onRegistered, which
      // return installation ids. The backend sends with firebase-admin's multicast send,
      // which takes these tokens, so keep them until both sides move together.
      // ignore: deprecated_member_use
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await api.post('/users/me/fcm-tokens', {'token': token});
      }
      // ignore: deprecated_member_use
      _refresh ??= FirebaseMessaging.instance.onTokenRefresh.listen(
        (t) => api
            .post('/users/me/fcm-tokens', {'token': t})
            .catchError((_) => null),
      );
      _listen();
    } catch (e) {
      // Notifications are a bonus; the app works without them.
      debugPrint('Push setup failed: $e');
    }
  }

  void _listen() {
    if (_listening) return;
    _listening = true;
    // While the app is open, show the message at the bottom of the screen.
    FirebaseMessaging.onMessage.listen((message) {
      final n = message.notification;
      if (n == null) return;
      messengerKey.currentState?.showSnackBar(
        SnackBar(
          content: Text([n.title, n.body].whereType<String>().join(': ')),
          action: _orderAction(message),
        ),
      );
    });
    // Tapping a notification opens its order.
    FirebaseMessaging.onMessageOpenedApp.listen(_openOrder);
    FirebaseMessaging.instance.getInitialMessage().then((m) {
      if (m != null) _openOrder(m);
    });
  }

  SnackBarAction? _orderAction(RemoteMessage message) {
    final orderId = message.data['orderId'] as String?;
    return orderId == null
        ? null
        : SnackBarAction(label: 'View', onPressed: () => _openOrder(message));
  }

  void _openOrder(RemoteMessage message) {
    final orderId = message.data['orderId'] as String?;
    if (orderId == null) return;
    navigatorKey.currentState?.push(
      MaterialPageRoute<void>(
        builder: (_) => OrderDetailScreen(orderId: orderId),
      ),
    );
  }

  /// Before signing out: this phone stops getting the account's notifications.
  Future<void> forget() async {
    if (!firebaseReady) return;
    await _refresh?.cancel();
    _refresh = null;
    // ignore: deprecated_member_use
    await FirebaseMessaging.instance.deleteToken().catchError((_) {});
  }
}
