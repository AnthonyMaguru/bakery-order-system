import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import 'core/firebase_setup.dart';
import 'core/theme.dart';
import 'features/auth/push.dart';
import 'features/auth/sign_in_screen.dart';
import 'features/auth/account_screen.dart';
import 'features/bakeries/bakeries_screen.dart';
import 'features/orders/my_orders_screen.dart';
import 'features/outbox/outbox.dart';

bool shouldPromptSignIn({
  required bool firebaseReady,
  required bool signedIn,
}) => firebaseReady && !signedIn;

class BakeryApp extends StatelessWidget {
  const BakeryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bakery Orders',
      theme: appTheme,
      navigatorKey: navigatorKey,
      scaffoldMessengerKey: messengerKey,
      home: StreamBuilder<User?>(
        stream: firebaseReady
            ? FirebaseAuth.instance.authStateChanges()
            : Stream<User?>.value(null),
        builder: (context, snapshot) {
          final signedIn = snapshot.data != null;
          if (firebaseReady && !signedIn) {
            return const SignInScreen();
          }
          return const HomeShell();
        },
      ),
    );
  }
}

/// Bottom navigation between the main tabs. Also sends any saved orders whenever
/// the app comes back to the foreground, which is often when a connection returns.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> with WidgetsBindingObserver {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      Outbox.instance.flush();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [BakeriesScreen(), MyOrdersScreen(), AccountScreen()],
      ),
      bottomNavigationBar: ListenableBuilder(
        listenable: Outbox.instance,
        builder: (context, _) {
          final waiting = Outbox.instance.items.length;
          return NavigationBar(
            selectedIndex: _index,
            onDestinationSelected: (i) => setState(() => _index = i),
            destinations: [
              const NavigationDestination(
                icon: Icon(Icons.storefront_outlined),
                selectedIcon: Icon(Icons.storefront),
                label: 'Bakeries',
              ),
              NavigationDestination(
                icon: Badge(
                  isLabelVisible: waiting > 0,
                  label: Text('$waiting'),
                  child: const Icon(Icons.receipt_long_outlined),
                ),
                selectedIcon: const Icon(Icons.receipt_long),
                label: 'My orders',
              ),
              const NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Account',
              ),
            ],
          );
        },
      ),
    );
  }
}
