import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../../models/order.dart';
import '../auth/auth.dart';
import '../outbox/outbox.dart';
import 'order_detail_screen.dart';

/// The customer's orders, with anything still waiting on the phone at the top.
class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  late Future<List<Order>> _orders;
  var _started = false;
  bool _past = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    _orders = _load();
  }

  Future<List<Order>> _load() async {
    await Future<void>.delayed(Duration.zero);
    if (!await ensureSignedIn(context)) return [];
    final data = await api.get('/orders') as List;
    return data.map((o) => Order.fromJson(o as Map<String, dynamic>)).toList();
  }

  Future<void> _refresh() async {
    await Outbox.instance.flush();
    final next = _load();
    setState(() => _orders = next);
    await next.catchError((_) => <Order>[]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: ListenableBuilder(
            listenable: Outbox.instance,
            builder: (context, _) => FutureBuilder(
              future: _orders,
              builder: (context, snapshot) {
                final orders = snapshot.data ?? [];
                final open = orders.where((o) => o.status != 'COMPLETED' && o.status != 'CANCELLED').toList();
                final past = orders.where((o) => !open.contains(o)).toList();
                final outbox = Outbox.instance.items;
                return ListView(
                  padding: const EdgeInsets.only(bottom: 24),
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                      child: Text('My orders', style: Theme.of(context).textTheme.headlineMedium),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: SegmentedButton<bool>(
                        showSelectedIcon: false,
                        style: SegmentedButton.styleFrom(minimumSize: const Size.fromHeight(44)),
                        segments: [
                          ButtonSegment(value: false, label: Text('In progress (${open.length + outbox.length})')),
                          const ButtonSegment(value: true, label: Text('Past')),
                        ],
                        selected: {_past},
                        onSelectionChanged: (s) => setState(() => _past = s.first),
                      ),
                    ),
                    if (!_past) for (final item in outbox) _OutboxRow(item: item),
                    if (snapshot.hasError)
                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text(
                          snapshot.error is NetworkException ? "You're offline. Pull down to try again." : snapshot.error.toString(),
                          style: const TextStyle(color: AppColors.muted),
                        ),
                      )
                    else if (!snapshot.hasData)
                      const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
                    else ...[
                      for (final o in _past ? past : open) _OrderRow(order: o, onClosed: _refresh),
                      if ((_past ? past : open).isEmpty && (outbox.isEmpty || _past))
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Text(_past ? 'Finished and cancelled orders show here.' : 'No orders yet. Find a bakery to get started.', style: const TextStyle(color: AppColors.muted)),
                        ),
                    ],
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  const _OrderRow({required this.order, required this.onClosed});

  final Order order;
  final VoidCallback onClosed;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = statusColours[order.status]!;
    final quote = order.latestQuote;
    final String? next = switch (order.status) {
      'QUOTED' when quote != null => '${money(quote.amount, order.currency)} is waiting for your answer',
      'CONFIRMED' when order.total != null && order.paymentStatus != 'PAID' => 'Pay ${money(order.total! - order.amountPaid, order.currency)} to the bakery',
      'READY' => order.fulfilment == 'PICKUP' ? 'Ready to collect' : 'On its way soon',
      _ => null,
    };
    return InkWell(
      onTap: () async {
        await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OrderDetailScreen(orderId: order.id)));
        onClosed();
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.line))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(order.title, style: Theme.of(context).textTheme.titleMedium)),
                Pill(statusLabels[order.status]!, background: bg, foreground: fg),
              ],
            ),
            const SizedBox(height: 4),
            Text('${order.bakeryName} · ${dayLabel(order.dueDate)}, ${order.fulfilment == 'PICKUP' ? 'pickup' : 'delivery'}', style: const TextStyle(fontSize: 14, color: AppColors.muted)),
            if (next != null) ...[
              const SizedBox(height: 4),
              Text(next, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: order.status == 'QUOTED' ? AppColors.accent : AppColors.ink2)),
            ],
          ],
        ),
      ),
    );
  }
}

class _OutboxRow extends StatelessWidget {
  const _OutboxRow({required this.item});

  final OutboxItem item;

  @override
  Widget build(BuildContext context) {
    final failed = item.error != null;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.symmetric(vertical: 18),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.line))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(item.title, style: Theme.of(context).textTheme.titleMedium)),
              Pill(failed ? "Couldn't send" : 'Waiting to send', background: failed ? AppColors.dangerSoft : AppColors.sand, foreground: failed ? AppColors.danger : AppColors.ink2),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            failed ? '${item.bakeryName} said: ${item.error}' : '${item.bakeryName} · saved on your phone ${timeLabel(item.savedAt)}. It sends by itself when you are online.',
            style: const TextStyle(fontSize: 14, color: AppColors.muted),
          ),
          Row(
            children: [
              if (!failed) TextButton(onPressed: () => Outbox.instance.flush(), child: const Text('Try now')),
              TextButton(
                style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                onPressed: () => Outbox.instance.remove(item.clientRequestId),
                child: Text(failed ? 'Remove' : 'Remove from phone'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
