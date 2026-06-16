import 'models/auth_models.dart';

enum AuthStatus {
  unknown,
  authenticated,
  unauthenticated,
  loading,
}

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.errorMessage,
    this.isBusy = false,
    this.isBootstrapped = false,
  });

  const AuthState.unknown()
      : status = AuthStatus.unknown,
        user = null,
        errorMessage = null,
        isBusy = false,
        isBootstrapped = false;

  final AuthStatus status;
  final AuthUser? user;
  final String? errorMessage;
  final bool isBusy;
  final bool isBootstrapped;

  bool get isAuthenticated => status == AuthStatus.authenticated;

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    bool clearUser = false,
    String? errorMessage,
    bool clearError = false,
    bool? isBusy,
    bool? isBootstrapped,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isBusy: isBusy ?? this.isBusy,
      isBootstrapped: isBootstrapped ?? this.isBootstrapped,
    );
  }
}
