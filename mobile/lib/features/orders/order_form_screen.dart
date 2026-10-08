import 'package:flutter/material.dart';

import '../../core/api_client.dart';

/// Guided order form. Starter version: occasion, flavour, inscription, due date.
///
/// TODO(mobile lead):
/// - remaining fields from docs/api.md (icing, size, colours, theme, budget, delivery)
/// - inspiration images: compress on device, upload to Firebase Storage, send URLs
/// - save drafts locally so an order survives a dropped connection (stretch)
class OrderFormScreen extends StatefulWidget {
  const OrderFormScreen({super.key});

  @override
  State<OrderFormScreen> createState() => _OrderFormScreenState();
}

class _OrderFormScreenState extends State<OrderFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _occasion = TextEditingController();
  final _flavour = TextEditingController();
  final _inscription = TextEditingController();
  DateTime? _dueDate;
  bool _submitting = false;

  @override
  void dispose() {
    _occasion.dispose();
    _flavour.dispose();
    _inscription.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      initialDate: now.add(const Duration(days: 3)),
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  String? _optional(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  Future<void> _submit() async {
    if (_dueDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick a due date')));
      return;
    }
    setState(() => _submitting = true);
    try {
      await api.post('/orders', {
        'type': 'CUSTOM',
        'fulfilment': 'PICKUP',
        'dueDate': _dueDate!.toUtc().toIso8601String(),
        'occasion': _optional(_occasion),
        'flavour': _optional(_flavour),
        'inscription': _optional(_inscription),
      }..removeWhere((_, v) => v == null));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order submitted')));
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not submit: $e')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Custom order')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _occasion,
              decoration: const InputDecoration(labelText: 'Occasion (e.g. Birthday)'),
            ),
            TextFormField(
              controller: _flavour,
              decoration: const InputDecoration(labelText: 'Flavour (optional)'),
            ),
            TextFormField(
              controller: _inscription,
              decoration: const InputDecoration(labelText: 'Writing on the cake (optional)'),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _pickDate,
              icon: const Icon(Icons.event),
              label: Text(_dueDate == null
                  ? 'Pick due date'
                  : 'Due ${_dueDate!.day}/${_dueDate!.month}/${_dueDate!.year}'),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? 'Submitting…' : 'Submit order'),
            ),
          ],
        ),
      ),
    );
  }
}
