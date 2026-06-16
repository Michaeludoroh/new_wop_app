import 'package:flutter/material.dart';

import '../core/auth/auth_scope.dart';
import '../core/auth/models/auth_models.dart';
import '../widgets/ministry_app_bar_title.dart';
import 'reset_password_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  static const String routeName = '/forgot-password';

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  bool _submitting = false;
  String? _submitError;
  String? _submitSuccess;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  String? _validateEmail(String? value) {
    final input = (value ?? '').trim();
    if (input.isEmpty) return 'Email is required';
    final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailRegex.hasMatch(input)) return 'Enter a valid email';
    return null;
  }

  Future<void> _submit() async {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) {
      return;
    }

    setState(() {
      _submitting = true;
      _submitError = null;
      _submitSuccess = null;
    });

    try {
      await AuthScope.read(context).forgotPassword(
        ForgotPasswordRequest(
          email: _emailController.text.trim(),
        ),
      );

      if (!mounted) return;
      setState(() {
        _submitSuccess = 'If that email exists, a reset link has been sent.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitError = 'Failed to request password reset. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(title: 'Forgot Password'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    key: const Key('forgot_password_email_field'),
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.done,
                    enabled: !_submitting,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                    ),
                    validator: _validateEmail,
                    onFieldSubmitted: (_) => _submit(),
                  ),
                  const SizedBox(height: 12),
                  if (_submitError != null) ...[
                    Text(
                      _submitError!,
                      style:
                          TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (_submitSuccess != null) ...[
                    Text(
                      _submitSuccess!,
                      key: const Key('forgot_password_success_message'),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      key: const Key('go_to_reset_password_button'),
                      onPressed: _submitting
                          ? null
                          : () {
                              Navigator.of(
                                context,
                              ).pushNamed(ResetPasswordScreen.routeName);
                            },
                      child:
                          const Text('Already have a reset token? Reset now'),
                    ),
                    const SizedBox(height: 12),
                  ],
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      key: const Key('forgot_password_submit_button'),
                      onPressed: _submitting ? null : _submit,
                      child: _submitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Send reset link'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
