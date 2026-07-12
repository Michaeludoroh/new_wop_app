import 'package:flutter/foundation.dart';

import 'auth_service.dart';
import 'auth_state.dart';
import 'models/auth_models.dart';
import 'token_storage_service.dart';
import '../notifications/services/firebase_messaging_service.dart';
import '../policies/policy_acceptance_diagnostics.dart';
import '../policies/policy_acceptance_gate.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider({
    AuthService? authService,
    TokenStorageService? tokenStorageService,
    FirebaseMessagingService? firebaseMessagingService,
  })  : _authService = authService ?? AuthService(),
        _tokenStorageService = tokenStorageService ?? TokenStorageService(),
        _firebaseMessagingService =
            firebaseMessagingService ?? FirebaseMessagingService();

  final AuthService _authService;
  final TokenStorageService _tokenStorageService;
  final FirebaseMessagingService _firebaseMessagingService;

  AuthState _state = const AuthState.unknown();
  AuthState get state => _state;
  FirebaseMessagingService get firebaseMessagingService =>
      _firebaseMessagingService;

  Future<void> reloadCurrentUser() async {
    if (!_state.isAuthenticated) return;
    final user = await _authService.me();
    _setState(_state.copyWith(user: user));
  }

  Future<void> bootstrap() async {
    _setState(
      _state.copyWith(
        status: AuthStatus.loading,
        isBusy: true,
        clearError: true,
      ),
    );

    try {
      final accessToken = await _tokenStorageService.getAccessToken();
      if (accessToken == null || accessToken.isEmpty) {
        _setState(
          _state.copyWith(
            status: AuthStatus.unauthenticated,
            clearUser: true,
            isBusy: false,
            isBootstrapped: true,
            clearError: true,
          ),
        );
        return;
      }

      final expiry = await _tokenStorageService.getTokenExpiry();
      if (expiry != null && expiry.isBefore(DateTime.now().toUtc())) {
        try {
          await _authService.refresh();
        } catch (_) {
          await _tokenStorageService.clearTokens();
          _setState(
            _state.copyWith(
              status: AuthStatus.unauthenticated,
              clearUser: true,
              isBusy: false,
              isBootstrapped: true,
              clearError: true,
            ),
          );
          return;
        }
      }

      final user = await _authService.me();
      _setAuthenticated(user, isBootstrapped: true);
    } catch (e) {
      _setState(
        _state.copyWith(
          status: AuthStatus.unauthenticated,
          clearUser: true,
          errorMessage: e.toString(),
          isBusy: false,
          isBootstrapped: true,
        ),
      );
    }
  }

  Future<void> login(LoginRequest request) async {
    await _runBusyAction(() async {
      final session = await _authService.login(request);
      _setAuthenticated(session.user);
    });
  }

  Future<void> register(RegisterRequest request) async {
    await _runBusyAction(() async {
      final session = await _authService.register(request);
      _setAuthenticated(session.user);
    });
  }

  Future<void> resendVerificationEmail() async {
    await _runBusyAction(() async {
      await _authService.resendVerificationEmail();
      _setState(_state.copyWith(isBusy: false, clearError: true));
    });
  }

  Future<bool> refreshProfileAfterVerification() async {
    if (!_state.isAuthenticated) return false;

    try {
      final user = await _authService.me();
      _setAuthenticated(user);
      return user.emailVerified;
    } catch (e) {
      _setState(
        _state.copyWith(
          errorMessage: e.toString(),
          isBusy: false,
        ),
      );
      return false;
    }
  }

  Future<void> forgotPassword(ForgotPasswordRequest request) async {
    await _runBusyAction(() async {
      await _authService.forgotPassword(request);
      _setState(
        _state.copyWith(
          status: AuthStatus.unauthenticated,
          isBusy: false,
          clearError: true,
          isBootstrapped: true,
        ),
      );
    });
  }

  Future<void> resetPassword(ResetPasswordRequest request) async {
    await _runBusyAction(() async {
      await _authService.resetPassword(request);
      _setState(
        _state.copyWith(
          status: AuthStatus.unauthenticated,
          isBusy: false,
          clearError: true,
          isBootstrapped: true,
        ),
      );
    });
  }

  Future<void> refreshSession() async {
    await _runBusyAction(() async {
      final refreshed = await _refreshIfExpiredOrNearExpiry();
      if (!refreshed && !await _hasValidAccessToken()) {
        await _tokenStorageService.clearTokens();
        _setState(
          _state.copyWith(
            status: AuthStatus.unauthenticated,
            clearUser: true,
            isBusy: false,
            isBootstrapped: true,
            clearError: true,
          ),
        );
        return;
      }

      final user = await _authService.me();
      _setAuthenticated(user);
    });
  }

  Future<void> ensureValidSession() async {
    if (_state.status != AuthStatus.authenticated) {
      return;
    }

    try {
      final refreshed = await _refreshIfExpiredOrNearExpiry();
      if (!refreshed) {
        return;
      }

      final user = await _authService.me();
      _setAuthenticated(user);
    } catch (e) {
      await _tokenStorageService.clearTokens();
      _setState(
        _state.copyWith(
          status: AuthStatus.unauthenticated,
          clearUser: true,
          errorMessage: e.toString(),
          isBusy: false,
          isBootstrapped: true,
        ),
      );
    }
  }

  Future<void> fetchCurrentUser() async {
    await _runBusyAction(() async {
      final user = await _authService.me();
      _setAuthenticated(user);
    });
  }

  Future<void> logout() async {
    await _runBusyAction(() async {
      await _firebaseMessagingService.revokeCurrentToken();
      await _authService.logout();
      PolicyAcceptanceGate.resetSession();
      _setState(
        _state.copyWith(
          status: AuthStatus.unauthenticated,
          clearUser: true,
          clearError: true,
          isBusy: false,
          isBootstrapped: true,
        ),
      );
    });
  }

  Future<bool> _refreshIfExpiredOrNearExpiry() async {
    final expiry = await _tokenStorageService.getTokenExpiry();
    if (expiry == null) {
      return false;
    }

    final nowUtc = DateTime.now().toUtc();
    final refreshThreshold = nowUtc.add(const Duration(minutes: 2));
    final shouldRefresh = !expiry.isAfter(refreshThreshold);

    if (!shouldRefresh) {
      return false;
    }

    await _authService.refresh();
    return true;
  }

  Future<bool> _hasValidAccessToken() async {
    final accessToken = await _tokenStorageService.getAccessToken();
    return accessToken != null && accessToken.isNotEmpty;
  }

  Future<void> _runBusyAction(Future<void> Function() action) async {
    _setState(
      _state.copyWith(
        status: AuthStatus.loading,
        isBusy: true,
        clearError: true,
      ),
    );

    try {
      await action();
      _setState(_state.copyWith(isBusy: false, clearError: true));
    } catch (e) {
      debugPrint('AUTH_PROVIDER ERROR: $e');

      _setState(
        _state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: e.toString(),
          isBusy: false,
        ),
      );
    }
  }

  void _setAuthenticated(AuthUser user, {bool isBootstrapped = true}) {
    debugPrint('AUTH STATE -> AUTHENTICATED');
    debugPrint('USER -> ${user.email}');
    PolicyAcceptanceDiagnostics.log(
      'AuthProvider._setAuthenticated userId=${user.id} bootstrapped=$isBootstrapped',
    );
    _setState(
      _state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        isBusy: false,
        clearError: true,
        isBootstrapped: isBootstrapped,
      ),
    );
    _registerPushToken();
  }

 void _setState(AuthState newState) {
  debugPrint(
    'STATE CHANGE => '
    '${newState.status} '
    'bootstrapped=${newState.isBootstrapped} '
    'user=${newState.user?.email}',
  );

  _state = newState;
  notifyListeners();
}

  Future<void> _registerPushToken() async {
    await _firebaseMessagingService.initialize();
    await _firebaseMessagingService.registerCurrentToken();
  }
}
