import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';

void main() {
  group('AuthState', () {
    test('initial creates unknown, not busy, not bootstrapped state', () {
      const state = AuthState.unknown();

      expect(state.status, AuthStatus.unknown);
      expect(state.user, isNull);
      expect(state.errorMessage, isNull);
      expect(state.isBusy, isFalse);
      expect(state.isBootstrapped, isFalse);
      expect(state.isAuthenticated, isFalse);
    });

    test('copyWith updates selected fields', () {
      const initial = AuthState.unknown();
      final updated = initial.copyWith(
        status: AuthStatus.loading,
        errorMessage: 'error',
        isBusy: true,
        isBootstrapped: true,
      );

      expect(updated.status, AuthStatus.loading);
      expect(updated.errorMessage, 'error');
      expect(updated.isBusy, isTrue);
      expect(updated.isBootstrapped, isTrue);
      expect(updated.user, isNull);
    });

    test('isAuthenticated true only when status is authenticated', () {
      const state = AuthState.unknown();

      expect(
        state.copyWith(status: AuthStatus.authenticated).isAuthenticated,
        isTrue,
      );
      expect(
        state.copyWith(status: AuthStatus.unauthenticated).isAuthenticated,
        isFalse,
      );
      expect(
          state.copyWith(status: AuthStatus.loading).isAuthenticated, isFalse);
      expect(
          state.copyWith(status: AuthStatus.unknown).isAuthenticated, isFalse);
    });
  });
}
