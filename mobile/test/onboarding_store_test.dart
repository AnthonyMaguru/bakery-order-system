import 'package:bakery_orders/features/onboarding/onboarding_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('onboarding is incomplete until it is completed', () async {
    SharedPreferences.setMockInitialValues({});
    const store = OnboardingStore();

    expect(await store.isComplete(), isFalse);
    await store.complete();
    expect(await store.isComplete(), isTrue);
  });
}
