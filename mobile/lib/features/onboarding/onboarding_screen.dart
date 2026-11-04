import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../auth/push.dart';
import 'onboarding_store.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, this.onComplete});

  final VoidCallback? onComplete;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pages = const [
    _OnboardingPage(
      icon: Icons.storefront_outlined,
      title: 'Find a bakery for the moment',
      body:
          'Browse local bakeries and discover the right cake for birthdays, milestones, and ordinary good days.',
    ),
    _OnboardingPage(
      icon: Icons.auto_awesome_outlined,
      title: 'Make your idea easy to order',
      body:
          'Choose a ready-made cake or build a custom brief. Your bakery has the details it needs before sending a quote.',
    ),
    _OnboardingPage(
      icon: Icons.notifications_none_rounded,
      title: 'Stay close to your order',
      body:
          'We can let you know when your bakery replies, sends a quote, or updates your order.',
    ),
  ];

  var _index = 0;
  var _finishing = false;
  String? _error;

  Future<void> _finish({bool requestNotifications = false}) async {
    if (_finishing) return;
    setState(() {
      _finishing = true;
      _error = null;
    });
    Object? notificationError;
    try {
      if (requestNotifications) {
        try {
          await Push.instance.requestPermission();
        } catch (error) {
          notificationError = error;
        }
      }
      await const OnboardingStore().complete();
      if (!mounted) return;
      if (notificationError != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Onboarding is complete. You can enable order notifications later in settings.',
            ),
          ),
        );
      }
      widget.onComplete?.call();
    } catch (error) {
      if (mounted)
        setState(
          () => _error =
              'Could not save your onboarding progress. Please try again.',
        );
    } finally {
      if (mounted) setState(() => _finishing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final page = _pages[_index];
    final isLast = _index == _pages.length - 1;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Image.asset(
                    'assets/images/app_logo.png',
                    width: 40,
                    height: 40,
                    fit: BoxFit.contain,
                    semanticLabel: 'Crumb & Co. logo',
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Crumb & Co.',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: _finishing ? null : () => _finish(),
                    child: const Text('Skip'),
                  ),
                ],
              ),
              const Spacer(),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: Column(
                  key: ValueKey(_index),
                  children: [
                    Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        color: AppColors.accentSoft,
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: Icon(page.icon, color: AppColors.accent, size: 42),
                    ),
                    const SizedBox(height: 32),
                    Text(
                      page.title,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 14),
                    Text(
                      page.body,
                      textAlign: TextAlign.center,
                      style: Theme.of(
                        context,
                      ).textTheme.bodyLarge?.copyWith(color: AppColors.muted),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < _pages.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      width: i == _index ? 24 : 8,
                      height: 8,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        color: i == _index
                            ? AppColors.accent
                            : AppColors.lineStrong,
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _finishing
                    ? null
                    : isLast
                    ? () => _finish(requestNotifications: true)
                    : () => setState(() => _index += 1),
                child: Text(
                  _finishing
                      ? 'Finishing...'
                      : isLast
                      ? 'Allow order updates'
                      : 'Continue',
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ],
              if (isLast)
                TextButton(
                  onPressed: _finishing ? null : () => _finish(),
                  child: const Text('Not now'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardingPage {
  const _OnboardingPage({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;
}
