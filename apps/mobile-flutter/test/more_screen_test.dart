import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/screens/about_screen.dart';
import 'package:ministry_mobile/screens/announcements_screen.dart';
import 'package:ministry_mobile/screens/mentorship_screen.dart';
import 'package:ministry_mobile/screens/more_screen.dart';
import 'package:ministry_mobile/screens/programs_screen.dart';
import 'package:ministry_mobile/screens/subscription_screen.dart';

void main() {
  testWidgets('MoreScreen shows ministry menu items', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: MoreScreen(),
      ),
    );

    expect(find.text('Announcements'), findsOneWidget);
    expect(find.text('Programs'), findsOneWidget);
    expect(find.text('Mentorship'), findsOneWidget);
    expect(find.text('Subscription'), findsOneWidget);
    expect(find.text('About WOP'), findsOneWidget);
  });

  testWidgets('MoreScreen navigates to about', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          AboutScreen.routeName: (_) => const Scaffold(
                body: Text('About Screen'),
              ),
        },
        home: const MoreScreen(),
      ),
    );

    await tester.tap(find.text('About WOP'));
    await tester.pumpAndSettle();

    expect(find.text('About Screen'), findsOneWidget);
  });

  testWidgets('MoreScreen navigates to announcements', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          AnnouncementsScreen.routeName: (_) => const Scaffold(
                body: Text('Announcements Screen'),
              ),
        },
        home: const MoreScreen(),
      ),
    );

    await tester.tap(find.text('Announcements'));
    await tester.pumpAndSettle();

    expect(find.text('Announcements Screen'), findsOneWidget);
  });

  testWidgets('MoreScreen navigates to programs', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          ProgramsScreen.routeName: (_) =>
              const Scaffold(body: Text('Programs Screen')),
        },
        home: const MoreScreen(),
      ),
    );

    await tester.tap(find.text('Programs'));
    await tester.pumpAndSettle();

    expect(find.text('Programs Screen'), findsOneWidget);
  });

  testWidgets('MoreScreen navigates to mentorship', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          MentorshipScreen.routeName: (_) =>
              const Scaffold(body: Text('Mentorship Screen')),
        },
        home: const MoreScreen(),
      ),
    );

    await tester.tap(find.text('Mentorship'));
    await tester.pumpAndSettle();
    expect(find.text('Mentorship Screen'), findsOneWidget);
  });

  testWidgets('MoreScreen navigates to subscription', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          SubscriptionScreen.routeName: (_) =>
              const Scaffold(body: Text('Subscription Screen')),
        },
        home: const MoreScreen(),
      ),
    );

    await tester.tap(find.text('Subscription'));
    await tester.pumpAndSettle();
    expect(find.text('Subscription Screen'), findsOneWidget);
  });
}
