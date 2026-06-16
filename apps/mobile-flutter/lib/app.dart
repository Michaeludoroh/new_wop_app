import 'package:flutter/material.dart';

import 'core/auth/auth_scope.dart';
import 'core/auth/auth_state.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'screens/dashboard_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/auth_landing_screen.dart';

class MinistryMobileApp extends StatelessWidget {
  const MinistryMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = AuthScope.of(context);

    return AnimatedBuilder(
      animation: authProvider,
      builder: (context, _) {
  final authState = authProvider.state;

  debugPrint(
    'APP STATE => '
    'APP STATE -> ${authState.status} '
    'status=${authState.status} '
    'bootstrapped=${authState.isBootstrapped} '
    'user=${authState.user?.email}',
  );

        final statusText = switch (authState.status) {
          AuthStatus.authenticated => 'Authenticated',
          AuthStatus.unauthenticated => 'Unauthenticated',
          AuthStatus.loading => 'Loading',
          AuthStatus.unknown => 'Unknown',
        };

        final home = (!authState.isBootstrapped ||
                authState.status == AuthStatus.unknown ||
                authState.status == AuthStatus.loading)
            ? const SplashScreen()
            : (authState.status == AuthStatus.authenticated
                ? DashboardScreen(
                    authStatusLabel: statusText,
                    authError: authState.errorMessage,
                  )
                : const AuthLandingScreen());

        return MaterialApp(
          title: 'Ministry Community',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          onGenerateRoute: AppRouter.onGenerateRoute,
          home: home,
        );
      },
    );
  }
}
