import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../../models/bakery.dart';

/// Pickup or delivery, the delivery area (only areas the bakery covers) and the address.
class FulfilmentFields extends StatelessWidget {
  const FulfilmentFields({
    super.key,
    required this.bakery,
    required this.fulfilment,
    required this.area,
    required this.address,
    required this.landmark,
    required this.onFulfilment,
    required this.onArea,
  });

  final Bakery bakery;
  final String fulfilment;
  final String? area;
  final TextEditingController address;
  final TextEditingController landmark;
  final ValueChanged<String> onFulfilment;
  final ValueChanged<String?> onArea;

  @override
  Widget build(BuildContext context) {
    final canDeliver = bakery.deliveryZones.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FieldLabel('How will you get it?'),
        SegmentedButton<String>(
          showSelectedIcon: false,
          style: SegmentedButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
            selectedBackgroundColor: AppColors.accentSoft,
            selectedForegroundColor: AppColors.accent,
          ),
          segments: [
            ButtonSegment(
              value: 'PICKUP',
              label: const Text('Pickup, free'),
              enabled: bakery.pickupAvailable,
            ),
            ButtonSegment(
              value: 'DELIVERY',
              label: const Text('Delivery · bakery confirms cost'),
              enabled: canDeliver,
            ),
          ],
          selected: {fulfilment},
          onSelectionChanged: (s) => onFulfilment(s.first),
        ),
        if (fulfilment == 'PICKUP') ...[
          const SizedBox(height: 8),
          Text(
            bakery.address != null
                ? 'Pick up from ${bakery.address}, ${bakery.city}'
                : 'Pick up from ${bakery.name}, ${bakery.city}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 4),
          Text(
            _handoverWindowMessage(bakery),
            style: const TextStyle(fontSize: 12, color: AppColors.ink2),
          ),
        ],
        if (fulfilment == 'DELIVERY') ...[
          const SizedBox(height: 16),
          const FieldLabel('Area'),
          DropdownButtonFormField<String>(
            initialValue: area,
            hint: const Text('Choose the area'),
            items: [
              for (final zone in bakery.deliveryZones)
                DropdownMenuItem(value: zone.id, child: Text(zone.label)),
            ],
            onChanged: onArea,
          ),
          const SizedBox(height: 6),
          Text(
            '${bakery.name} will confirm the delivery cost before you accept the final quote.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 4),
          Text(
            _handoverWindowMessage(bakery),
            style: const TextStyle(fontSize: 12, color: AppColors.ink2),
          ),
          const SizedBox(height: 16),
          const FieldLabel('Street address or plot'),
          TextField(
            controller: address,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              hintText: 'Street, building and house or plot number',
            ),
          ),
          const SizedBox(height: 12),
          const FieldLabel(
            'Nearby landmark or delivery instructions',
            optional: true,
          ),
          TextField(
            controller: landmark,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              hintText: 'A nearby shop, school or other useful directions',
            ),
          ),
        ],
      ],
    );
  }
}

String _handoverWindowMessage(Bakery bakery) {
  final window = timeWindowLabel(bakery.parsedHandoverTimes);
  return window == null
      ? 'The bakery will confirm the handover time.'
      : 'Preferred handover window: $window. The bakery will confirm the exact time.';
}

/// Delivery when the bakery has delivery areas, otherwise pickup.
String defaultFulfilment(Bakery bakery) =>
    bakery.pickupAvailable ? 'PICKUP' : 'DELIVERY';

/// Why the order can't be sent yet, or null when pickup/delivery is complete.
String? fulfilmentProblem(String fulfilment, String? area, String address) {
  if (fulfilment != 'DELIVERY') return null;
  if (area == null) return 'Choose the delivery area';
  if (address.trim().isEmpty) return 'Add the delivery address';
  return null;
}
