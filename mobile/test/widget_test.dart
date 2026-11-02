import 'package:flutter_test/flutter_test.dart';

import 'package:bakery_orders/app.dart';

void main() {
  testWidgets('BakeryApp builds successfully', (WidgetTester tester) async {
    await tester.pumpWidget(const BakeryApp());

    expect(find.byType(BakeryApp), findsOneWidget);
  });
}
