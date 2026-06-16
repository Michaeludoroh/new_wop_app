import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ministry_mobile/screens/profile_screen.dart';

void main() {
  testWidgets('profile screen renders policies section', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ProfileScreen(),
      ),
    );

    expect(find.text('Policies & Governance'), findsOneWidget);
    expect(find.text('Terms of Use'), findsOneWidget);
    expect(find.text('Privacy Policy'), findsOneWidget);
    expect(find.text('Community Guidelines'), findsOneWidget);
    expect(find.text('Content Sharing Rules'), findsOneWidget);
  });
}
