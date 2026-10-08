import 'package:flutter_test/flutter_test.dart';

import 'package:bakery_orders/features/orders/order.dart';

void main() {
  test('humanize turns enum values into labels', () {
    expect(humanize('DEPOSIT_PAID'), 'Deposit paid');
    expect(humanize('READY'), 'Ready');
  });

  test('Order parses API JSON', () {
    final order = Order.fromJson({
      'id': 'abc',
      'type': 'CUSTOM',
      'status': 'SUBMITTED',
      'dueDate': '2026-11-02T14:00:00.000Z',
      'paymentStatus': 'UNPAID',
      'occasion': 'Birthday',
    });
    expect(order.occasion, 'Birthday');
    expect(order.dueDate.isUtc, isTrue);
  });
}
