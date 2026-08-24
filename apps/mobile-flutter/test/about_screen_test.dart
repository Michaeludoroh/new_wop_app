import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/constants/app_constants.dart';
import 'package:ministry_mobile/core/theme/app_colors.dart';
import 'package:ministry_mobile/core/theme/app_theme.dart';
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

  testWidgets('About cards stay white in light mode and use dark surface in dark mode',
      (tester) async {
    BoxDecoration? firstBrandingDecoration() {
      final containers = tester.widgetList<Container>(find.byType(Container));
      for (final container in containers) {
        final decoration = container.decoration;
        if (decoration is BoxDecoration &&
            decoration.borderRadius == BorderRadius.circular(16)) {
          return decoration;
        }
      }
      return null;
    }

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.light,
        themeAnimationDuration: Duration.zero,
        home: const AboutScreen(),
      ),
    );
    expect(firstBrandingDecoration()?.color, AppColors.white);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.dark,
        themeAnimationDuration: Duration.zero,
        home: const AboutScreen(),
      ),
    );
    expect(firstBrandingDecoration()?.color, AppColors.darkSurface);
  });
}
