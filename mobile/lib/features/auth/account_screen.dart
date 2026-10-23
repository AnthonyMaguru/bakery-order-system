import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import 'auth.dart';
import 'push.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  late Future<Map<String, dynamic>> _profile = _load();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  bool _editing = false;
  bool _saving = false;

  Future<Map<String, dynamic>> _load() async {
    final profile = Map<String, dynamic>.from(
      await api.get('/users/me') as Map,
    );
    _name.text =
        profile['name'] as String? ??
        FirebaseAuth.instance.currentUser?.displayName ??
        '';
    _phone.text = profile['phone'] as String? ?? '';
    return profile;
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      final profile = await api.patch('/users/me', {
        'name': _name.text.trim(),
        'phone': _phone.text.trim(),
      });
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) await user.updateDisplayName(_name.text.trim());
      if (!mounted) {
        return;
      }
      setState(() {
        _profile = Future.value(Map<String, dynamic>.from(profile as Map));
        _editing = false;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Profile updated')));
    } catch (e) {
      if (mounted) {
        showError(context, e);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _reload() async {
    final next = _load();
    setState(() {
      _profile = next;
    });
    await next;
  }

  String _initial(Map<String, dynamic> profile) {
    final name = (profile['name'] as String?)?.trim();
    if (name != null && name.isNotEmpty) {
      return name.characters.first.toUpperCase();
    }
    final email = (profile['email'] as String?)?.trim();
    if (email != null && email.isNotEmpty) {
      return email.characters.first.toUpperCase();
    }
    return '?';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: FutureBuilder<Map<String, dynamic>>(
          future: _profile,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return ErrorView(
                message: snapshot.error.toString(),
                onRetry: _reload,
              );
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final profile = snapshot.data!;
            final email =
                profile['email'] as String? ??
                FirebaseAuth.instance.currentUser?.email ??
                '';
            return RefreshIndicator(
              onRefresh: _reload,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                children: [
                  Text(
                    'Account',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 34,
                        backgroundColor: AppColors.accentSoft,
                        foregroundColor: AppColors.accent,
                        child: Text(
                          _initial(profile),
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              profile['name'] as String? ?? 'Your account',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 3),
                            Text(
                              email,
                              style: const TextStyle(color: AppColors.muted),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),
                  _Section(
                    title: 'Profile',
                    child: _editing
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const FieldLabel('Name'),
                              TextField(
                                controller: _name,
                                textCapitalization: TextCapitalization.words,
                              ),
                              const SizedBox(height: 16),
                              const FieldLabel('Phone number'),
                              TextField(
                                controller: _phone,
                                keyboardType: TextInputType.phone,
                              ),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: _saving ? null : _save,
                                      child: Text(
                                        _saving ? 'Saving...' : 'Save changes',
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  TextButton(
                                    onPressed: _saving
                                        ? null
                                        : () =>
                                              setState(() => _editing = false),
                                    child: const Text('Cancel'),
                                  ),
                                ],
                              ),
                            ],
                          )
                        : ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              (profile['name'] as String?)?.isNotEmpty == true
                                  ? profile['name'] as String
                                  : 'Add your name',
                            ),
                            subtitle: Text(
                              (profile['phone'] as String?)?.isNotEmpty == true
                                  ? profile['phone'] as String
                                  : 'Add a phone number for order updates',
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.edit_outlined),
                              tooltip: 'Edit profile',
                              onPressed: () => setState(() => _editing = true),
                            ),
                          ),
                  ),
                  const SizedBox(height: 16),
                  _Section(
                    title: 'Order updates',
                    child: FutureBuilder<PushStatus>(
                      future: Push.instance.status(),
                      builder: (context, snapshot) {
                        final status = snapshot.data;
                        if (status == null) {
                          return const ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: Icon(Icons.notifications_none),
                            title: Text('Checking notifications...'),
                          );
                        }
                        final enabled = status == PushStatus.enabled;
                        final blocked = status == PushStatus.denied;
                        final unavailable = status == PushStatus.unavailable;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Icon(
                            enabled
                                ? Icons.notifications_active_outlined
                                : Icons.notifications_none,
                            color: enabled ? AppColors.ok : AppColors.muted,
                          ),
                          title: Text(
                            enabled
                                ? 'Notifications enabled'
                                : blocked
                                ? 'Notifications are blocked'
                                : unavailable
                                ? 'Notifications unavailable'
                                : 'Get order updates',
                          ),
                          subtitle: Text(
                            enabled
                                ? 'We will notify you about quotes and order status changes.'
                                : blocked
                                ? 'Allow notifications in your device settings to receive order updates.'
                                : unavailable
                                ? 'Connect Firebase to enable order updates.'
                                : 'Know when your bakery replies or updates your order.',
                          ),
                          trailing: enabled
                              ? const Icon(
                                  Icons.check_circle,
                                  color: AppColors.ok,
                                )
                              : blocked
                              ? const Text(
                                  'Check device settings',
                                  textAlign: TextAlign.right,
                                  style: TextStyle(color: AppColors.muted),
                                )
                              : TextButton(
                                  onPressed: unavailable
                                      ? null
                                      : () async {
                                          final next = await Push.instance
                                              .requestPermission();
                                          if (next == PushStatus.enabled) {
                                            await Push.instance.register();
                                          }
                                          if (mounted) setState(() {});
                                        },
                                  child: const Text('Enable'),
                                ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 24),
                  OutlinedButton.icon(
                    onPressed: () async {
                      await signOut();
                    },
                    icon: const Icon(Icons.logout),
                    label: const Text('Sign out'),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line),
          ),
          child: child,
        ),
      ],
    );
  }
}
