import 'package:flutter/material.dart';

import 'core/theme.dart';
import 'features/catalogue/catalogue_screen.dart';
import 'features/orders/orders_screen.dart';

class BakeryApp extends StatelessWidget {
  const BakeryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bakery Orders',
      theme: appTheme,
      home: const HomeShell(),
    );
  }
}

/// Bottom navigation between the main tabs.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _tabs = [CatalogueScreen(), OrdersScreen()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _tabs[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.cake_outlined), label: 'Cakes'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), label: 'My orders'),
        ],
      ),
    );
  }
}
