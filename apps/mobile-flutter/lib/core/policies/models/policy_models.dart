class PolicyItem {
  const PolicyItem({
    required this.id,
    required this.type,
    required this.typeLabel,
    required this.title,
    required this.slug,
    required this.content,
    required this.version,
    required this.published,
    this.effectiveDate,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String type;
  final String typeLabel;
  final String title;
  final String slug;
  final String content;
  final int version;
  final bool published;
  final DateTime? effectiveDate;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get plainContent => _stripHtml(content);

  String get effectiveDateLabel {
    final value = effectiveDate ?? updatedAt ?? createdAt;
    if (value == null) return 'Effective immediately';
    return 'Effective ${value.toLocal()}'.split('.').first;
  }

  factory PolicyItem.fromJson(Map<String, dynamic> json) {
    return PolicyItem(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      typeLabel: json['typeLabel']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      version: _asInt(json['version'], fallback: 1),
      published: json['published'] == true,
      effectiveDate: _parseDate(json['effectiveDate']),
      createdAt: _parseDate(json['createdAt']),
      updatedAt: _parseDate(json['updatedAt']),
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }

  static int _asInt(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }

  static String _stripHtml(String value) {
    return value
        .replaceAll(RegExp(r'<[^>]*>'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }
}

class PolicyAcceptanceStatus {
  const PolicyAcceptanceStatus({
    required this.pending,
    required this.accepted,
    required this.requiresAction,
  });

  final List<PolicyItem> pending;
  final List<PolicyAcceptedEntry> accepted;
  final bool requiresAction;

  factory PolicyAcceptanceStatus.fromJson(Map<String, dynamic> json) {
    final pending = json['pending'];
    final accepted = json['accepted'];
    return PolicyAcceptanceStatus(
      pending: pending is List
          ? pending
              .whereType<Map>()
              .map((item) => PolicyItem.fromJson(item.cast<String, dynamic>()))
              .toList()
          : const [],
      accepted: accepted is List
          ? accepted
              .whereType<Map>()
              .map(
                (item) => PolicyAcceptedEntry.fromJson(item.cast<String, dynamic>()),
              )
              .toList()
          : const [],
      requiresAction: json['requiresAction'] == true,
    );
  }
}

class PolicyAcceptedEntry {
  const PolicyAcceptedEntry({
    required this.policy,
    required this.version,
    required this.acceptedAt,
  });

  final PolicyItem policy;
  final int version;
  final DateTime? acceptedAt;

  factory PolicyAcceptedEntry.fromJson(Map<String, dynamic> json) {
    final policy = json['policy'];
    return PolicyAcceptedEntry(
      policy: policy is Map<String, dynamic>
          ? PolicyItem.fromJson(policy)
          : policy is Map
              ? PolicyItem.fromJson(policy.cast<String, dynamic>())
              : const PolicyItem(
                  id: '',
                  type: '',
                  typeLabel: '',
                  title: '',
                  slug: '',
                  content: '',
                  version: 1,
                  published: true,
                ),
      version: PolicyItem._asInt(json['version'], fallback: 1),
      acceptedAt: PolicyItem._parseDate(json['acceptedAt']),
    );
  }
}

class PolicyTypeOption {
  const PolicyTypeOption({required this.value, required this.label});

  final String value;
  final String label;

  factory PolicyTypeOption.fromJson(Map<String, dynamic> json) {
    return PolicyTypeOption(
      value: json['value']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
    );
  }
}

class PolicyTypeDefinitions {
  static const termsOfUse = 'TERMS_OF_USE';
  static const privacyPolicy = 'PRIVACY_POLICY';
  static const communityGuidelines = 'COMMUNITY_GUIDELINES';
  static const contentSharingRules = 'CONTENT_SHARING_RULES';

  static const all = [
    termsOfUse,
    privacyPolicy,
    communityGuidelines,
    contentSharingRules,
  ];

  static String labelFor(String type) {
    switch (type) {
      case termsOfUse:
        return 'Terms of Use';
      case privacyPolicy:
        return 'Privacy Policy';
      case communityGuidelines:
        return 'Community Guidelines';
      case contentSharingRules:
        return 'Content Sharing Rules';
      default:
        return type;
    }
  }
}
