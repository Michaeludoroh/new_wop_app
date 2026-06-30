import 'package:flutter/foundation.dart';

import 'subscription_models.dart';
import 'subscription_service.dart';
import 'trial_manager.dart';

class SubscriptionProvider extends ChangeNotifier {
  SubscriptionProvider({SubscriptionService? service})
      : _service = service ?? SubscriptionService();

  final SubscriptionService _service;

  SubscriptionStatusModel? _status;
  bool _loading = false;
  String? _error;

  SubscriptionStatusModel? get status => _status;
  bool get loading => _loading;
  String? get error => _error;
  bool get hasPremiumAccess => TrialManager.hasPremiumAccess(_status);
  bool get showTrialBanner => TrialManager.showTrialBanner(_status);

  SubscriptionService get service => _service;

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _status = await _service.getStatus();
    } catch (error) {
      _error = 'Unable to load subscription status.';
      if (kDebugMode) {
        debugPrint('SubscriptionProvider.refresh failed: $error');
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void clear() {
    _status = null;
    _error = null;
    _loading = false;
    notifyListeners();
  }
}
