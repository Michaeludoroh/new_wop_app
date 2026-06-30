enum MembershipPlan {
  free,
  premium,
  partner,
  unknown,
}

class SubscriptionAccessModel {
  SubscriptionAccessModel({
    required this.hasPremiumAccess,
    required this.isGracePeriod,
    this.graceEndsAt,
    this.daysRemainingInGrace,
    required this.renewalDue,
    required this.cancelAtPeriodEnd,
    this.isTrial = false,
    this.trialEndsAt,
    this.daysRemaining,
    this.isSubscribed = false,
    this.subscriptionRequired = false,
  });

  final bool hasPremiumAccess;
  final bool isGracePeriod;
  final DateTime? graceEndsAt;
  final int? daysRemainingInGrace;
  final bool renewalDue;
  final bool cancelAtPeriodEnd;
  final bool isTrial;
  final DateTime? trialEndsAt;
  final int? daysRemaining;
  final bool isSubscribed;
  final bool subscriptionRequired;

  factory SubscriptionAccessModel.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return SubscriptionAccessModel(
        hasPremiumAccess: false,
        isGracePeriod: false,
        renewalDue: false,
        cancelAtPeriodEnd: false,
        subscriptionRequired: true,
      );
    }
    return SubscriptionAccessModel(
      hasPremiumAccess: (json['hasPremiumAccess'] ?? false) as bool,
      isGracePeriod: (json['isGracePeriod'] ?? false) as bool,
      graceEndsAt: _parseDate(json['graceEndsAt']),
      daysRemainingInGrace: json['daysRemainingInGrace'] as int?,
      renewalDue: (json['renewalDue'] ?? false) as bool,
      cancelAtPeriodEnd: (json['cancelAtPeriodEnd'] ?? false) as bool,
      isTrial: (json['isTrial'] ?? false) as bool,
      trialEndsAt: _parseDate(json['trialEndsAt']),
      daysRemaining: json['daysRemaining'] as int?,
      isSubscribed: (json['isSubscribed'] ?? false) as bool,
      subscriptionRequired: (json['subscriptionRequired'] ?? false) as bool,
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value is String) return DateTime.tryParse(value)?.toLocal();
    return null;
  }
}

class SubscriptionStatusModel {
  SubscriptionStatusModel({
    required this.plan,
    required this.status,
    this.startDate,
    this.endDate,
    this.access,
    this.cancelAtPeriodEnd = false,
  });

  final MembershipPlan plan;
  final String status;
  final DateTime? startDate;
  final DateTime? endDate;
  final SubscriptionAccessModel? access;
  final bool cancelAtPeriodEnd;

  bool get isActive {
    final normalized = status.toUpperCase();
    return normalized == 'ACTIVE' || normalized == 'GRACE';
  }

  bool get isGracePeriod => access?.isGracePeriod ?? status.toUpperCase() == 'GRACE';

  bool get hasPremiumAccess => access?.hasPremiumAccess ?? isActive;

  bool get isTrial => access?.isTrial ?? false;

  bool get isSubscribed => access?.isSubscribed ?? isActive;

  bool get subscriptionRequired => access?.subscriptionRequired ?? !hasPremiumAccess;

  int? get trialDaysRemaining => access?.daysRemaining;

  factory SubscriptionStatusModel.fromJson(Map<String, dynamic> json) {
    final planValue = json['plan'];
    final planRaw = planValue is Map
        ? (planValue['code'] ?? planValue['name'] ?? '').toString().toLowerCase()
        : (planValue ?? '').toString().toLowerCase();
    MembershipPlan plan = MembershipPlan.unknown;
    if (planRaw.contains('free')) plan = MembershipPlan.free;
    if (planRaw.contains('premium') || planRaw.contains('basic')) plan = MembershipPlan.premium;
    if (planRaw.contains('partner')) plan = MembershipPlan.partner;

    final accessRaw = json['access'];
    return SubscriptionStatusModel(
      plan: plan,
      status: (json['status'] ?? 'INACTIVE').toString(),
      startDate: _parseDate(json['startDate'] ?? json['startedAt'] ?? json['currentPeriodStart']),
      endDate: _parseDate(json['endDate'] ?? json['currentPeriodEnd']),
      cancelAtPeriodEnd: (json['cancelAtPeriodEnd'] ?? false) as bool,
      access: accessRaw is Map
          ? SubscriptionAccessModel.fromJson(
              accessRaw.map((k, v) => MapEntry(k.toString(), v)),
            )
          : null,
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value is String) return DateTime.tryParse(value)?.toLocal();
    return null;
  }
}

class SubscriptionPlanModel {
  SubscriptionPlanModel({
    required this.code,
    required this.name,
    required this.amount,
    required this.billingInterval,
  });

  final String code;
  final String name;
  final double amount;
  final String billingInterval;

  factory SubscriptionPlanModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionPlanModel(
      code: (json['code'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      amount: _parseDouble(json['amount']),
      billingInterval: (json['billingInterval'] ?? 'MONTHLY').toString(),
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }
}

class PaymentCheckoutResult {
  const PaymentCheckoutResult({
    required this.checkoutUrl,
    required this.providerReference,
  });

  final String checkoutUrl;
  final String providerReference;

  factory PaymentCheckoutResult.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map
        ? (json['data'] as Map).map((k, v) => MapEntry(k.toString(), v))
        : json;
    return PaymentCheckoutResult(
      checkoutUrl: (data['checkoutUrl'] ?? '').toString(),
      providerReference: (data['providerReference'] ?? '').toString(),
    );
  }
}

class PaymentStatusResult {
  const PaymentStatusResult({
    required this.providerReference,
    required this.status,
    this.failureMessage,
  });

  final String providerReference;
  final String status;
  final String? failureMessage;

  bool get isSuccessful => status.toUpperCase() == 'SUCCESS';
  bool get isFailed => status.toUpperCase() == 'FAILED';

  factory PaymentStatusResult.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map
        ? (json['data'] as Map).map((k, v) => MapEntry(k.toString(), v))
        : json;
    return PaymentStatusResult(
      providerReference: (data['providerReference'] ?? '').toString(),
      status: (data['status'] ?? 'PENDING').toString(),
      failureMessage: data['failureMessage']?.toString(),
    );
  }
}
