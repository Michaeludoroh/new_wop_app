import 'package:flutter/material.dart';

import 'core/constants/app_constants.dart';
import 'core/auth/auth_scope.dart';
import 'core/auth/auth_state.dart';
import 'core/subscriptions/subscription_provider.dart';
import 'widgets/trial_banner.dart';
import 'core/theme/app_theme.dart';
import 'core/logging/app_log.dart';
import 'core/router/app_router.dart';
import 'screens/dashboard_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/auth_landing_screen.dart';

class MinistryMobileApp extends StatefulWidget {
  const MinistryMobileApp({super.key, this.theme});

  /// Optional theme override; defaults to [AppTheme.lightTheme].
  final ThemeData? theme;

  @override
  State<MinistryMobileApp> createState() => _MinistryMobileAppState();
}

class _MinistryMobileAppState extends State<MinistryMobileApp> {
  final GlobalKey _dashboardKey = GlobalKey();
  SubscriptionProvider? _subscriptionProvider;
  AuthStatus? _lastAuthStatus;

  @override
  void dispose() {
    _subscriptionProvider?.dispose();
    super.dispose();
  }

  SubscriptionProvider _ensureSubscriptionProvider() {
    return _subscriptionProvider ??= SubscriptionProvider();
  }

  void _syncSubscriptionWithAuth(AuthState authState) {
    final status = authState.status;
    if (_lastAuthStatus == status) {
      return;
    }

    if (status == AuthStatus.authenticated) {
      _ensureSubscriptionProvider().refresh();
    } else if (_lastAuthStatus == AuthStatus.authenticated) {
      _subscriptionProvider?.clear();
    }

    _lastAuthStatus = status;
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = AuthScope.of(context);

    return AnimatedBuilder(
      animation: authProvider,
      builder: (context, _) {
        final authState = authProvider.state;
        _syncSubscriptionWithAuth(authState);

        AppLog.debug(
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
                    key: _dashboardKey,
                    authStatusLabel: statusText,
                    authError: authState.errorMessage,
                  )
                : const AuthLandingScreen());

        final app = MaterialApp(
          title: AppConstants.appName,
          debugShowCheckedModeBanner: false,
          theme: widget.theme ?? AppTheme.lightTheme,
          onGenerateRoute: AppRouter.onGenerateRoute,
          home: home,
        );

        if (authState.status != AuthStatus.authenticated) {
          return app;
        }

        return SubscriptionScope(
          notifier: _ensureSubscriptionProvider(),
          child: app,
        );
      },
    );
  }
}
