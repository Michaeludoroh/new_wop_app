import 'package:dio/dio.dart';

import '../http/authenticated_dio.dart';
import 'models/event_models.dart';

class EventService {
  EventService({AuthenticatedDio? authenticatedDio})
      : _dio = (authenticatedDio ?? AuthenticatedDio()).dio;

  final Dio _dio;

  Future<EventListResponse> getEvents({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _dio.get<dynamic>(
      '/events/public',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        if (featured != null) 'featured': '$featured',
        'limit': limit,
        'offset': offset,
      },
    );

    return EventListResponse.fromJson(_asMap(response.data));
  }

  Future<EventListResponse> getFeaturedEvents({int limit = 8}) async {
    final response = await _dio.get<dynamic>(
      '/events/public/featured',
      queryParameters: {'limit': limit},
    );

    return EventListResponse.fromJson(_asMap(response.data));
  }

  Future<EventDetailsResponse> getEventDetails(String slugOrId) async {
    final response = await _dio.get<dynamic>('/events/public/$slugOrId');
    return EventDetailsResponse.fromJson(_asMap(response.data));
  }

  Future<EventRsvpResponse> rsvp(String eventId) async {
    final response = await _dio.post<dynamic>('/events/$eventId/rsvp');
    return EventRsvpResponse.fromJson(_asMap(response.data));
  }

  Future<EventCancelRsvpResponse> cancelRsvp(String eventId) async {
    final response = await _dio.delete<dynamic>('/events/$eventId/rsvp');
    return EventCancelRsvpResponse.fromJson(_asMap(response.data));
  }

  Future<EventRsvpStatusItem> getMyRsvp(String slugOrId) async {
    final response = await _dio.get<dynamic>('/events/me/$slugOrId/rsvp');
    return EventRsvpStatusItem.fromJson(_asMap(response.data));
  }

  Future<EventRsvpListResponse> getMyRsvps() async {
    final response = await _dio.get<dynamic>('/events/me/rsvps');
    return EventRsvpListResponse.fromJson(_asMap(response.data));
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return value.map((key, val) => MapEntry(key.toString(), val));
    }
    return <String, dynamic>{};
  }
}
