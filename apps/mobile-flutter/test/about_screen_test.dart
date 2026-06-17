import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/constants/app_constants.dart';
import 'package:ministry_mobile/screens/about_screen.dart';

void main() {
  testWidgets('AboutScreen displays branding and credits', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: AboutScreen(),
      ),
    );

    expect(find.text(AppConstants.appName), findsOneWidget);
    expect(find.text('Powered by'), findsOneWidget);
    expect(find.text(AppConstants.organizationName), findsOneWidget);
    expect(find.text('Developed by:'), findsOneWidget);
    expect(find.text(AppConstants.developersDisplay), findsOneWidget);
    expect(find.text(AppConstants.appVersion), findsOneWidget);
    expect(find.text(AppConstants.buildNumber), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text(AppConstants.copyrightNotice),
      200,
    );
    expect(find.text(AppConstants.copyrightNotice), findsOneWidget);
  });
}
