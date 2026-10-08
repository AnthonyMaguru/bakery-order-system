import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import 'order.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late Future<List<Order>> _orders = _load();

  Future<List<Order>> _load() async {
    final data = await api.get('/orders') as List<dynamic>;
    return data.map((o) => Order.fromJson(o as Map<String, dynamic>)).toList();
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _orders = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My orders')),
      body: FutureBuilder(
        future: _orders,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Could not load orders.\n${snapshot.error}'));
          }
          final orders = snapshot.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: orders.isEmpty
                ? ListView(children: const [ListTile(title: Text('You have no orders yet.'))])
                : ListView.separated(
                    itemCount: orders.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, i) {
                      final o = orders[i];
                      final due = o.dueDate.toLocal();
                      return ListTile(
                        title: Text(o.occasion ?? '${humanize(o.type)} order'),
                        subtitle: Text('Due ${due.day}/${due.month}/${due.year}'),
                        trailing: Chip(label: Text(humanize(o.status))),
                      );
                    },
                  ),
          );
        },
      ),
    );
  }
}
