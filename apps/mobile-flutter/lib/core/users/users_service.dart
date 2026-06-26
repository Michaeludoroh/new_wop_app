import 'package:dio/dio.dart';

import '../http/authenticated_dio.dart';

class UserProfile {
  UserProfile({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
  });

  final String id;
  final String email;
  final String fullName;
  final String role;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map<String, dynamic>
        ? json['data'] as Map<String, dynamic>
        : json;
    return UserProfile(
      id: (data['id'] ?? '').toString(),
      email: (data['email'] ?? '') as String,
      fullName: (data['fullName'] ?? data['name'] ?? '') as String,
      role: (data['role'] ?? 'USER') as String,
    );
  }
}

class UsersService {
  UsersService({AuthenticatedDio? authenticatedDio})
      : _client = authenticatedDio ?? AuthenticatedDio();

  final AuthenticatedDio _client;

  Future<UserProfile> getUser(String userId) async {
    final response = await _client.dio.get<dynamic>('/users/$userId');
    return UserProfile.fromJson(_asMap(response.data));
  }

  Future<UserProfile> updateProfile({
    required String userId,
    required String fullName,
  }) async {
    final response = await _client.dio.patch<dynamic>(
      '/users/$userId/profile',
      data: {'fullName': fullName},
    );
    return UserProfile.fromJson(_asMap(response.data));
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((key, val) => MapEntry(key.toString(), val));
    }
    return <String, dynamic>{};
  }
}
