import 'package:flutter/material.dart';

enum HomepageFeedKind {
  announcement,
  clip,
  event,
  ebook,
  program,
  mentorship,
}

class HomepageFeedItem {
  const HomepageFeedItem({
    required this.keyId,
    required this.kind,
    required this.eyebrow,
    required this.title,
    required this.actionLabel,
    required this.routeName,
    required this.fallbackIcon,
    this.subtitle,
    this.body,
    this.imageUrl,
    this.timestampLabel,
    this.routeArguments,
    this.prominent = false,
  });

  final String keyId;
  final HomepageFeedKind kind;
  final String eyebrow;
  final String title;
  final String? subtitle;
  final String? body;
  final String? imageUrl;
  final String? timestampLabel;
  final String actionLabel;
  final String routeName;
  final Object? routeArguments;
  final bool prominent;
  final IconData fallbackIcon;
}
