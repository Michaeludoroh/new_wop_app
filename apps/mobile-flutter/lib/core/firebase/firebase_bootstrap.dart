import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../../firebase_options.dart';

class FirebaseBootstrap {
  FirebaseBootstrap._();

  static bool _initialized = false;

  static bool get isConfigured => _initialized;

  static Future<void> initialize() async {
    if (_initialized || Firebase.apps.isNotEmpty) {
      _initialized = true;
      return;
    }

    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );

      _initialized = true;
      debugPrint('Firebase initialized successfully.');
    } catch (error) {
      debugPrint('Firebase bootstrap failed: $error');
    }
  }
}
