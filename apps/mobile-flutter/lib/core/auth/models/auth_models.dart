class AuthTokens {
  AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    this.expiresAt,
  });

  final String accessToken;
  final String refreshToken;
  final DateTime? expiresAt;

  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    final expiresAtRaw = json['expiresAt'] ?? json['accessTokenExpiresAt'];
    DateTime? expiresAt;
    if (expiresAtRaw is String) {
      expiresAt = DateTime.tryParse(expiresAtRaw)?.toUtc();
    }

    return AuthTokens(
      accessToken: (json['accessToken'] ?? '') as String,
      refreshToken: (json['refreshToken'] ?? '') as String,
      expiresAt: expiresAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      if (expiresAt != null) 'expiresAt': expiresAt!.toUtc().toIso8601String(),
    };
  }
}

class AuthUser {
  AuthUser({
    required this.id,
    required this.email,
    this.name,
    this.role,
  });

  final String id;
  final String email;
  final String? name;
  final String? role;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: (json['id'] ?? '').toString(),
      email: (json['email'] ?? '') as String,
      name: json['name'] as String?,
      role: json['role'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      if (name != null) 'name': name,
      if (role != null) 'role': role,
    };
  }
}

class AuthSession {
  AuthSession({
    required this.user,
    required this.tokens,
  });

  final AuthUser user;
  final AuthTokens tokens;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      user: AuthUser.fromJson(
          (json['user'] ?? <String, dynamic>{}) as Map<String, dynamic>),
      tokens: AuthTokens.fromJson(
          (json['tokens'] ?? <String, dynamic>{}) as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user': user.toJson(),
      'tokens': tokens.toJson(),
    };
  }
}

class LoginRequest {
  LoginRequest({
    required this.email,
    required this.password,
  });

  final String email;
  final String password;

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
    };
  }
}

class RegisterRequest {
  RegisterRequest({
    required this.email,
    required this.password,
    required this.name,
  });

  final String email;
  final String password;
  final String name;

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
      'fullName': name,
    };
  }
}

class ForgotPasswordRequest {
  ForgotPasswordRequest({required this.email});

  final String email;

  Map<String, dynamic> toJson() {
    return {'email': email};
  }
}

class ResetPasswordRequest {
  ResetPasswordRequest({
    required this.token,
    required this.newPassword,
  });

  final String token;
  final String newPassword;

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'newPassword': newPassword,
    };
  }
}
