import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../../models/bakery.dart';
import '../../models/product.dart';
import '../auth/auth.dart';
import '../common/date_sheet.dart';
import '../common/fulfilment_fields.dart';
import '../orders/submit.dart';

/// Ordering a ready made product. The price is known, so there is no quote.
class QuickCheckoutScreen extends StatefulWidget {
  const QuickCheckoutScreen({
    super.key,
    required this.product,
    required this.bakery,
    required this.quantity,
  });

  final Product product;
  final Bakery bakery;
  final int quantity;

  @override
  State<QuickCheckoutScreen> createState() => _QuickCheckoutScreenState();
}

class _QuickCheckoutScreenState extends State<QuickCheckoutScreen> {
  final _writing = TextEditingController();
  final _address = TextEditingController();
  final _landmark = TextEditingController();
  late String _fulfilment = defaultFulfilment(widget.bakery);
  String? _zoneId;
  DateTime? _due;
  String? _error;
  bool _sending = false;

  @override
  void dispose() {
    _writing.dispose();
    _address.dispose();
    _landmark.dispose();
    super.dispose();
  }

  Future<void> _place() async {
    final problem = _due == null
        ? 'Choose when you need it'
        : fulfilmentProblem(_fulfilment, _zoneId, _address.text);
    if (problem != null) return setState(() => _error = problem);
    if (!await ensureSignedIn(context)) return;
    if (!mounted) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await submitOrder(
        context,
        custom: false,
        title: widget.product.name,
        bakeryName: widget.bakery.name,
        body: {
          'bakeryId': widget.bakery.id,
          'type': 'STANDARD',
          if (_writing.text.trim().isNotEmpty)
            'inscription': _writing.text.trim(),
          'dueDate': _due!.toUtc().toIso8601String(),
          'fulfilment': _fulfilment,
          if (_fulfilment == 'DELIVERY') ...{
            'deliveryZoneId': _zoneId,
            'deliveryAddress': _address.text.trim(),
            if (_landmark.text.trim().isNotEmpty)
              'deliveryLandmark': _landmark.text.trim(),
          },
          'items': [
            {'productId': widget.product.id, 'quantity': widget.quantity},
          ],
        },
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final currency = widget.bakery.currency;
    final earliest = DateUtils.dateOnly(
      DateTime.now(),
    ).add(Duration(days: p.leadTimeDays));
    return Scaffold(
      appBar: AppBar(title: const Text('Your order')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.name,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      '${widget.quantity} × ${money(p.price, currency)} · ${widget.bakery.name}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Change'),
              ),
            ],
          ),
          const Divider(height: 32),
          const FieldLabel('Writing on top', optional: true),
          TextField(
            controller: _writing,
            maxLength: 40,
            decoration: const InputDecoration(
              hintText: 'For example Happy Birthday Joel',
            ),
          ),
          const SizedBox(height: 8),
          const FieldLabel('When do you need it?'),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              alignment: Alignment.centerLeft,
              side: const BorderSide(color: AppColors.lineStrong, width: 1.5),
            ),
            icon: const Icon(Icons.event_outlined),
            label: Text(
              _due == null ? 'Choose a day and time' : dateTimeLabel(_due!),
            ),
            onPressed: () async {
              final picked = await pickDueDate(
                context,
                bakery: widget.bakery,
                rule: ReadyMadeRule(p.leadTimeDays),
                initial: _due,
              );
              if (picked != null) setState(() => _due = picked);
            },
          ),
          const SizedBox(height: 6),
          Text(
            p.leadTimeDays == 0
                ? 'This can be ready today.'
                : 'This takes ${p.leadTimeDays} ${p.leadTimeDays == 1 ? 'day' : 'days'}. The earliest is ${dayLabel(earliest)}.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 20),
          FulfilmentFields(
            bakery: widget.bakery,
            fulfilment: _fulfilment,
            area: _zoneId,
            address: _address,
            landmark: _landmark,
            onFulfilment: (f) => setState(() => _fulfilment = f),
            onArea: (a) => setState(() => _zoneId = a),
          ),
          const Divider(height: 36),
          _SumRow(
            label: 'Product subtotal',
            value: money(p.price * widget.quantity, currency),
          ),
          if (_fulfilment == 'DELIVERY')
            const Text(
              'The bakery will confirm the delivery cost and final total before you accept the quote.',
              style: TextStyle(color: AppColors.ink2),
            ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Semantics(
              liveRegion: true,
              child: Text(
                _error!,
                style: const TextStyle(
                  color: AppColors.danger,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],
      ),
      bottomNavigationBar: BottomBar(
        note: _fulfilment == 'DELIVERY'
            ? 'No platform fee is charged. The bakery confirms delivery cost and final total; pay the bakery directly.'
            : 'No platform fee is charged. Pay the bakery directly.',
        child: FilledButton(
          onPressed: _sending ? null : _place,
          child: Text(_sending ? 'Sending…' : 'Place order'),
        ),
      ),
    );
  }
}

class _SumRow extends StatelessWidget {
  const _SumRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(fontSize: 15, color: AppColors.ink2);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}
