import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/homepage/homepage_feed_item.dart';
import 'package:ministry_mobile/core/theme/app_colors.dart';
import 'package:ministry_mobile/core/theme/app_theme.dart';
import 'package:ministry_mobile/screens/splash_screen.dart';
import 'package:ministry_mobile/widgets/homepage/homepage_feed_card.dart';

void main() {
  Widget app({
    required ThemeMode mode,
    required Widget home,
  }) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: mode,
      themeAnimationDuration: Duration.zero,
      home: home,
    );
  }

  testWidgets('Splash uses theme scaffold background in light and dark',
      (tester) async {
    await tester.pumpWidget(app(mode: ThemeMode.light, home: const SplashScreen()));
    expect(
      Theme.of(tester.element(find.byType(SplashScreen))).scaffoldBackgroundColor,
      AppColors.lightBackground,
    );

    await tester.pumpWidget(app(mode: ThemeMode.dark, home: const SplashScreen()));
    await tester.pump();
    expect(
      Theme.of(tester.element(find.byType(SplashScreen))).scaffoldBackgroundColor,
      AppColors.darkBackground,
    );
  });

  testWidgets('feed placeholder uses light purple in light and dark primaryContainer in dark',
      (tester) async {
    const item = HomepageFeedItem(
      keyId: 'clip-1',
      kind: HomepageFeedKind.clip,
      eyebrow: 'Clip',
      title: 'Sunday message',
      actionLabel: 'Watch',
      routeName: '/clips/details',
      fallbackIcon: Icons.play_circle_outline,
      prominent: true,
    );

    ColoredBox placeholderBox() {
      return tester.widget<ColoredBox>(
        find.descendant(
          of: find.byType(HomepageFeedCard),
          matching: find.byType(ColoredBox),
        ).first,
      );
    }

    await tester.pumpWidget(
      app(
        mode: ThemeMode.light,
        home: Scaffold(
          body: HomepageFeedCard(item: item, onOpen: () {}),
        ),
      ),
    );
    expect(placeholderBox().color, AppColors.lightPurple);

    await tester.pumpWidget(
      app(
        mode: ThemeMode.dark,
        home: Scaffold(
          body: HomepageFeedCard(item: item, onOpen: () {}),
        ),
      ),
    );
    await tester.pump();
    expect(
      placeholderBox().color,
      AppTheme.darkTheme.colorScheme.primaryContainer,
    );
  });
}
