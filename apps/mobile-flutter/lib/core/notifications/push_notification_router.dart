class PushNotificationRoute {
  const PushNotificationRoute(this.name, {this.arguments});

  final String name;
  final Object? arguments;
}

class PushNotificationRouter {
  static PushNotificationRoute? resolveRoute(Map<String, dynamic> data) {
    final entityType = data['entityType']?.toString().toUpperCase();
    final entityId = data['entityId']?.toString().trim();

    if (entityType == 'LIBRARY') {
      return const PushNotificationRoute('/library');
    }

    if (entityType != null && entityId != null && entityId.isNotEmpty) {
      switch (entityType) {
        case 'EVENT':
          return PushNotificationRoute('/events/details', arguments: entityId);
        case 'PROGRAM':
          return PushNotificationRoute('/programs/details', arguments: entityId);
        case 'MENTORSHIP':
          return PushNotificationRoute('/mentorship/details', arguments: entityId);
        case 'EBOOK':
          return PushNotificationRoute('/ebooks/details', arguments: entityId);
        case 'ANNOUNCEMENT':
          return PushNotificationRoute('/announcements/details', arguments: entityId);
      }
    }

    final explicitRoute = data['route']?.toString().trim();
    if (explicitRoute != null && explicitRoute.isNotEmpty) {
      return PushNotificationRoute(explicitRoute);
    }

    if (data['notificationId'] != null) {
      return const PushNotificationRoute('/notifications');
    }

    final category = data['category']?.toString().toUpperCase();
    if (category == 'NOTIFICATION') {
      return const PushNotificationRoute('/notifications');
    }

    return null;
  }
}
