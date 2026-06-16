import 'package:flutter/material.dart';

import '../core/auth/auth_scope.dart';
import '../core/auth/models/auth_models.dart';
import '../core/constants/app_constants.dart';
import '../core/theme/app_theme.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../widgets/ministry_logo.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  static const String routeName = '/login';

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _submitting = false;
  String? _submitError;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) {
      return;
    }

    setState(() {
      _submitting = true;
      _submitError = null;
    });

    try {
      await AuthScope.read(context).login(
        LoginRequest(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitError = 'Login failed. Please try again.';
      });
      return;
    }

    if (!mounted) return;
    setState(() {
      _submitting = false;
    });
  }

  String? _validateEmail(String? value) {
    final input = (value ?? '').trim();
    if (input.isEmpty) return 'Email is required';
    final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailRegex.hasMatch(input)) return 'Enter a valid email';
    return null;
  }

  String? _validatePassword(String? value) {
    final input = value ?? '';
    if (input.isEmpty) return 'Password is required';
    if (input.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(title: 'Sign In'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: MinistryLogo(
                          height: MinistryLogo.authFormHeight,
                          variant: MinistryLogoVariant.hero,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        AppConstants.appName,
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: theme.colorScheme.primary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Welcome back to WOP',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      TextFormField(
                        key: const Key('login_email_field'),
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        enabled: !_submitting,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                        ),
                        validator: _validateEmail,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        key: const Key('login_password_field'),
                        controller: _passwordController,
                        obscureText: true,
                        textInputAction: TextInputAction.done,
                        enabled: !_submitting,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                        ),
                        validator: _validatePassword,
                        onFieldSubmitted: (_) => _submit(),
                      ),
                      const SizedBox(height: 12),
                      if (_submitError != null) ...[
                        Text(
                          _submitError!,
                          style: TextStyle(color: theme.colorScheme.error),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                      ],
                      FilledButton(
                        key: const Key('login_submit_button'),
                        style: AppTheme.accentButtonStyle,
                        onPressed: _submitting ? null : _submit,
                        child: _submitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Login'),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        key: const Key('go_to_forgot_password_button'),
                        onPressed: _submitting
                            ? null
                            : () {
                                Navigator.of(context)
                                    .pushNamed(ForgotPasswordScreen.routeName);
                              },
                        child: const Text('Forgot password?'),
                      ),
                      TextButton(
                        key: const Key('go_to_register_button'),
                        onPressed: _submitting
                            ? null
                            : () {
                                Navigator.of(context)
                                    .pushNamed(RegisterScreen.routeName);
                              },
                        child: const Text('Create account'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
