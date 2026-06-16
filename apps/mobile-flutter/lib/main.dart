import 'package:flutter/material.dart';
import 'app.dart';
import 'core/auth/auth_provider.dart';
import 'core/auth/auth_scope.dart';
import 'core/firebase/firebase_bootstrap.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await FirebaseBootstrap.initialize();

  final authProvider = AuthProvider();
  await authProvider.bootstrap();

  runApp(
    AuthScope(
      notifier: authProvider,
      child: MinistryMobileApp(theme: AppTheme.lightTheme),
    ),
  );
}
