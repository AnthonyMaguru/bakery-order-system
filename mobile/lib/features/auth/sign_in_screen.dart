import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import 'auth.dart';
import 'push.dart';

enum _Mode { signIn, create, reset }

/// Pops with true once the customer is signed in.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  var _mode = _Mode.signIn;
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _notice;

  @override
  void dispose() {
    for (final c in [_name, _phone, _email, _password]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = FirebaseAuth.instance;
    final email = _email.text.trim();
    if (_mode == _Mode.create && (_name.text.trim().isEmpty || _phone.text.trim().isEmpty)) {
      return setState(() => _error = 'Add your name and phone number, so the bakery can reach you about your cake');
    }
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      switch (_mode) {
        case _Mode.reset:
          await auth.sendPasswordResetEmail(email: email);
          setState(() {
            _notice = 'If $email has an account, a reset link is on its way. Check the inbox and spam folder.';
            _mode = _Mode.signIn;
          });
          return;
        case _Mode.create:
          final cred = await auth.createUserWithEmailAndPassword(email: email, password: _password.text);
          await cred.user!.updateDisplayName(_name.text.trim());
          await cred.user!.getIdToken(true);
          // The backend makes the account on the first request; save the name and phone there too.
          await api.patch('/users/me', {'name': _name.text.trim(), 'phone': _phone.text.trim()}).catchError((_) => null);
        case _Mode.signIn:
          await auth.signInWithEmailAndPassword(email: email, password: _password.text);
      }
      await Push.instance.register();
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = authMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = switch (_mode) {
      _Mode.signIn => 'Sign in to order',
      _Mode.create => 'Create your account',
      _Mode.reset => 'Reset your password',
    };
    return Scaffold(
      appBar: AppBar(leading: IconButton(icon: const Icon(Icons.close), tooltip: 'Close', onPressed: () => Navigator.of(context).pop(false))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        children: [
          Text(title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(
            switch (_mode) {
              _Mode.signIn => 'So the bakery knows who the cake is for, and you can follow your orders.',
              _Mode.create => 'It takes a minute. Your phone number is only shared with bakeries you order from.',
              _Mode.reset => "We'll email you a link to choose a new password.",
            },
            style: const TextStyle(color: AppColors.muted),
          ),
          if (_notice != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.okSoft, borderRadius: BorderRadius.circular(12)),
              child: Text(_notice!, style: const TextStyle(color: AppColors.ok)),
            ),
          ],
          const SizedBox(height: 24),
          if (_mode == _Mode.create) ...[
            const FieldLabel('Your name'),
            TextField(controller: _name, textCapitalization: TextCapitalization.words, autofillHints: const [AutofillHints.name]),
            const SizedBox(height: 16),
            const FieldLabel('Phone number'),
            TextField(controller: _phone, keyboardType: TextInputType.phone, autofillHints: const [AutofillHints.telephoneNumber], decoration: const InputDecoration(hintText: '0772 000 000')),
            const SizedBox(height: 16),
          ],
          const FieldLabel('Email'),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], decoration: const InputDecoration(hintText: 'you@example.com')),
          if (_mode != _Mode.reset) ...[
            const SizedBox(height: 16),
            const FieldLabel('Password'),
            TextField(
              controller: _password,
              obscureText: true,
              autofillHints: [_mode == _Mode.create ? AutofillHints.newPassword : AutofillHints.password],
              decoration: InputDecoration(hintText: _mode == _Mode.create ? 'At least 6 characters' : null),
              onSubmitted: (_) => _submit(),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 14),
            Semantics(liveRegion: true, child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600))),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Please wait…' : switch (_mode) { _Mode.signIn => 'Sign in', _Mode.create => 'Create account', _Mode.reset => 'Send reset link' }),
          ),
          const SizedBox(height: 12),
          if (_mode == _Mode.signIn) ...[
            TextButton(onPressed: () => setState(() => _mode = _Mode.reset), child: const Text('Forgot your password?')),
            TextButton(onPressed: () => setState(() => _mode = _Mode.create), child: const Text('New here? Create an account')),
          ] else
            TextButton(onPressed: () => setState(() => _mode = _Mode.signIn), child: const Text('Back to sign in')),
        ],
      ),
    );
  }
}
