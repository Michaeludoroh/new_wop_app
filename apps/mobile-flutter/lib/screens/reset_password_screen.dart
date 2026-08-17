import 'package:flutter/material.dart';

import '../core/auth/auth_scope.dart';
import '../core/auth/models/auth_models.dart';
import '../core/http/api_error.dart';
import '../widgets/ministry_app_bar_title.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key, this.initialToken});

  static const String routeName = '/reset-password';

  final String? initialToken;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _tokenController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _submitting = false;
  String? _submitError;
  String? _submitSuccess;

  @override
  void initState() {
    super.initState();
    final initial = widget.initialToken?.trim();
    if (initial != null && initial.isNotEmpty) {
      _tokenController.text = _normalizeToken(initial);
    }
  }

  @override
  void dispose() {
    _tokenController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  String _normalizeToken(String input) {
    final trimmed = input.trim();
    final uri = Uri.tryParse(trimmed);
    if (uri != null && uri.hasScheme && uri.queryParameters['token'] != null) {
      final token = uri.queryParameters['token']!.trim();
      if (token.isNotEmpty) {
        return token;
      }
    }
    return trimmed;
  }

  String? _validateToken(String? value) {
    final input = _normalizeToken(value ?? '');
    if (input.isEmpty) return 'Reset token is required';
    return null;
  }

  String? _validatePassword(String? value) {
    final input = value ?? '';
    if (input.isEmpty) return 'Password is required';
    if (input.length < 8) return 'Password must be at least 8 characters';
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
      await AuthScope.read(context).resetPassword(
        ResetPasswordRequest(
          token: _normalizeToken(_tokenController.text),
          newPassword: _passwordController.text,
        ),
      );

      if (!mounted) return;
      setState(() {
        _submitSuccess =
            'Password has been reset successfully. You can now log in.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _submitError = messageFromDio(
          error,
          fallback: 'Failed to reset password. Please try again.',
        );
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
        title: const MinistryAppBarTitle(title: 'Reset Password'),
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
                    key: const Key('reset_password_token_field'),
                    controller: _tokenController,
                    textInputAction: TextInputAction.next,
                    enabled: !_submitting,
                    decoration: const InputDecoration(
                      labelText: 'Reset token',
                      border: OutlineInputBorder(),
                    ),
                    validator: _validateToken,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    key: const Key('reset_password_new_password_field'),
                    controller: _passwordController,
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    enabled: !_submitting,
                    decoration: const InputDecoration(
                      labelText: 'New password',
                      border: OutlineInputBorder(),
                    ),
                    validator: _validatePassword,
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
                      key: const Key('reset_password_success_message'),
                    ),
                    const SizedBox(height: 12),
                  ],
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      key: const Key('reset_password_submit_button'),
                      onPressed: _submitting ? null : _submit,
                      child: _submitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Reset password'),
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
