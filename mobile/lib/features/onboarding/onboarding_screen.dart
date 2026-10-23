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
  var _requestingNotifications = false;

  Future<void> _finish({bool requestNotifications = false}) async {
    if (requestNotifications) {
      setState(() => _requestingNotifications = true);
      await Push.instance.requestPermission();
      if (mounted) setState(() => _requestingNotifications = false);
    }
    await const OnboardingStore().complete();
    if (mounted) widget.onComplete?.call();
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
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: _requestingNotifications ? null : () => _finish(),
                  child: const Text('Skip'),
                ),
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
                onPressed: _requestingNotifications
                    ? null
                    : isLast
                    ? () => _finish(requestNotifications: true)
                    : () => setState(() => _index += 1),
                child: Text(
                  _requestingNotifications
                      ? 'Setting up notifications...'
                      : isLast
                      ? 'Allow order updates'
                      : 'Continue',
                ),
              ),
              if (isLast)
                TextButton(
                  onPressed: _requestingNotifications ? null : () => _finish(),
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
