import 'package:bakery_orders/features/custom_order/builder_rules.dart';
import 'package:bakery_orders/features/custom_order/draft.dart';
import 'package:bakery_orders/models/bakery.dart';
import 'package:bakery_orders/models/builder.dart';
import 'package:bakery_orders/models/order.dart';
import 'package:flutter_test/flutter_test.dart';

final bakeryJson = {
  'id': 'b1',
  'slug': 'sweet-crumbs',
  'name': 'Sweet Crumbs Bakery',
  'city': 'Kampala',
  'currency': 'UGX',
  'deliveryAreas': ['Kisaasi', 'Ntinda'],
  'deliveryFee': 5000,
  'pickupAvailable': true,
  'acceptsCash': true,
  'acceptsMobileMoney': true,
  'cakesFrom': 60000,
  'nextCustomDate': '2026-10-20',
};

void main() {
  test('parses a bakery and matches delivery areas in any case', () {
    final bakery = Bakery.fromJson(bakeryJson);
    expect(bakery.deliversTo('ntinda'), isTrue);
    expect(bakery.deliversTo('Entebbe'), isFalse);
    expect(bakery.cakesFrom, 60000);
  });

  test('parses order details, newest quote first', () {
    final order = Order.fromJson({
      'id': 'o1',
      'number': 1043,
      'type': 'CUSTOM',
      'status': 'QUOTED',
      'currency': 'UGX',
      'occasion': 'Birthday',
      'dueDate': '2026-11-07T11:00:00.000Z',
      'fulfilment': 'DELIVERY',
      'deliveryArea': 'Ntinda',
      'paymentStatus': 'UNPAID',
      'amountPaid': 0,
      'estimate': 165000,
      'bakery': {'name': 'Sweet Crumbs Bakery', 'mobileMoneyNumber': '0772 000 000'},
      'items': [],
      'selections': [
        {'groupName': 'Shape', 'optionName': 'Round'},
      ],
      'quotations': [
        {'id': 'q2', 'amount': 165000, 'createdAt': '2026-10-15T08:40:00.000Z'},
        {'id': 'q1', 'amount': 170000, 'createdAt': '2026-10-14T08:40:00.000Z'},
      ],
      'comments': [
        {'id': 'c1', 'body': 'Gold writing?', 'fromBakery': false, 'createdAt': '2026-10-14T07:05:00.000Z'},
      ],
    });
    expect(order.title, 'Birthday cake');
    expect(order.latestQuote!.id, 'q2');
    expect(order.selections.single, isA<MapEntry<String, String>>());
    expect(order.needsQuote, isTrue);
  });

  test('parses the shorter order list shape too', () {
    final order = Order.fromJson({
      'id': 'o2',
      'number': 1042,
      'type': 'STANDARD',
      'status': 'CONFIRMED',
      'currency': 'UGX',
      'dueDate': '2026-10-20T11:00:00.000Z',
      'fulfilment': 'PICKUP',
      'paymentStatus': 'UNPAID',
      'amountPaid': 0,
      'total': 85000,
      'bakery': {'id': 'b1', 'slug': 'sweet-crumbs', 'name': 'Sweet Crumbs Bakery'},
      'items': [
        {'id': 'i1', 'quantity': 1, 'unitPrice': 85000, 'product': {'id': 'p1', 'name': 'Red velvet cake'}},
      ],
      'quotations': [],
    });
    expect(order.title, 'Red velvet cake');
    expect(order.comments, isEmpty);
  });

  test('a builder draft becomes the API body', () {
    final groups = [
      OptionGroup(id: 'g1', kind: 'SHAPE', name: 'Shape', multiple: false, required: true, options: [BuilderOption(id: 'round', name: 'Round', price: 0)]),
      OptionGroup(id: 'g2', kind: 'SIZE', name: 'Size', multiple: false, required: true, options: [BuilderOption(id: '2kg', name: '2 kg', price: 110000)]),
    ];
    final draft = CustomOrderDraft(bakery: Bakery.fromJson(bakeryJson))
      ..groups = groups
      ..selection = defaultSelection(groups)
      ..inscription = '  Happy 5th Birthday Amara '
      ..dueDate = DateTime.utc(2026, 11, 7, 11)
      ..fulfilment = 'DELIVERY'
      ..deliveryArea = 'Ntinda'
      ..deliveryAddress = 'Plot 12';
    final body = draft.toJson();
    expect(body['type'], 'CUSTOM');
    expect(body['optionIds'], ['round', '2kg']);
    expect(body['inscription'], 'Happy 5th Birthday Amara');
    expect(body['dueDate'], '2026-11-07T11:00:00.000Z');
    expect(body.containsKey('flavour'), isFalse, reason: 'free text fields are only for described cakes');
    expect(body.containsKey('theme'), isFalse, reason: 'empty answers are left out');
    expect(draft.estimate, 110000);
  });
}
