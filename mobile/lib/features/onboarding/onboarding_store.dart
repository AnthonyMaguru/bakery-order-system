import 'package:shared_preferences/shared_preferences.dart';

const onboardingVersion = 1;
const _completedKey = 'onboarding_completed_v$onboardingVersion';

class OnboardingStore {
  const OnboardingStore();

  Future<bool> isComplete() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_completedKey) ?? false;
  }

  Future<void> complete() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_completedKey, true);
  }
}
