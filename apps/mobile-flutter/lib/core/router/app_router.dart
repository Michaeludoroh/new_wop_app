import 'package:flutter/material.dart';

import '../auth/auth_scope.dart';
import '../auth/auth_state.dart';
import '../../screens/dashboard_screen.dart';
import '../../screens/login_screen.dart';
import '../../screens/forgot_password_screen.dart';
import '../../screens/register_screen.dart';
import '../../screens/reset_password_screen.dart';
import '../../screens/auth_landing_screen.dart';
import '../../screens/notifications_screen.dart';
import '../../screens/ebook_screen.dart';
import '../../screens/ebook_details_screen.dart';
import '../../screens/my_library_screen.dart';
import '../../screens/subscription_screen.dart';
import '../../screens/pdf_reader_screen.dart';
import '../../screens/clips_screen.dart';
import '../../screens/clip_details_screen.dart';
import '../../screens/events_screen.dart';
import '../../screens/event_details_screen.dart';
import '../../screens/programs_screen.dart';
import '../../screens/program_details_screen.dart';
import '../../screens/mentorship_screen.dart';
import '../../screens/mentorship_details_screen.dart';
import '../../screens/announcements_screen.dart';
import '../../screens/announcement_details_screen.dart';
import '../../screens/profile_screen.dart';
import '../../screens/policy_screen.dart';

class AppRouter {
  static const Set<String> _authRoutes = {
    LoginScreen.routeName,
    RegisterScreen.routeName,
    ForgotPasswordScreen.routeName,
    ResetPasswordScreen.routeName,
  };

  static const Map<String, Set<String>> _requiredRolesByRoute = {
    '/': {'admin', 'member', 'user'},
    NotificationsScreen.routeName: {'admin', 'member', 'user'},
    EventsScreen.routeName: {'admin', 'member', 'user'},
    EventDetailsScreen.routeName: {'admin', 'member', 'user'},
    ProgramsScreen.routeName: {'admin', 'member', 'user'},
    ProgramDetailsScreen.routeName: {'admin', 'member', 'user'},
    MentorshipScreen.routeName: {'admin', 'member', 'user'},
    MentorshipDetailsScreen.routeName: {'admin', 'member', 'user'},
    AnnouncementsScreen.routeName: {'admin', 'member', 'user'},
    AnnouncementDetailsScreen.routeName: {'admin', 'member', 'user'},
    ProfileScreen.routeName: {'admin', 'member', 'user'},
    PolicyScreen.routeName: {'admin', 'member', 'user'},
    TermsOfUseScreen.routeName: {'admin', 'member', 'user'},
    PrivacyPolicyScreen.routeName: {'admin', 'member', 'user'},
    CommunityGuidelinesScreen.routeName: {'admin', 'member', 'user'},
    ContentSharingRulesScreen.routeName: {'admin', 'member', 'user'},
    EbookScreen.routeName: {'admin', 'member', 'user'},
    EbookDetailsScreen.routeName: {'admin', 'member', 'user'},
    ClipsScreen.routeName: {'admin', 'member', 'user'},
    ClipDetailsScreen.routeName: {'admin', 'member', 'user'},
    MyLibraryScreen.routeName: {'admin', 'member', 'user'},
    SubscriptionScreen.routeName: {'admin', 'member', 'user'},
    PdfReaderScreen.routeName: {'admin', 'member', 'user'},
  };

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    return MaterialPageRoute<void>(
      settings: settings,
      builder: (context) {
        final authState = AuthScope.of(context).state;
        final routeName = settings.name ?? '/';

        if (authState.status == AuthStatus.loading ||
            authState.status == AuthStatus.unknown ||
            !authState.isBootstrapped) {
          return const SizedBox.shrink();
        }

        if (_authRoutes.contains(routeName) && authState.isAuthenticated) {
          return DashboardScreen(
            authStatusLabel: 'Authenticated',
            authError: authState.errorMessage,
          );
        }

        if (!_authRoutes.contains(routeName) && !authState.isAuthenticated) {
          if (routeName == '/') {
            return const AuthLandingScreen();
          }
          return const LoginScreen();
        }

        final requiredRoles = _requiredRolesByRoute[routeName];
        if (requiredRoles != null && authState.isAuthenticated) {
          final role = authState.user?.role?.toLowerCase();
          if (role == null || !requiredRoles.contains(role)) {
            return const Scaffold(
              body: Center(
                child: Text('You do not have permission to access this page.'),
              ),
            );
          }
        }

        switch (routeName) {
          case LoginScreen.routeName:
            return const LoginScreen();
          case RegisterScreen.routeName:
            return const RegisterScreen();
          case ForgotPasswordScreen.routeName:
            return const ForgotPasswordScreen();
          case ResetPasswordScreen.routeName:
            return const ResetPasswordScreen();
          case NotificationsScreen.routeName:
            return const NotificationsScreen();
          case EventsScreen.routeName:
            return const EventsScreen();
          case EventDetailsScreen.routeName:
            final eventId = settings.arguments as String?;
            if (eventId == null || eventId.isEmpty) {
              return const Scaffold(
                body: Center(child: Text('Missing event ID')),
              );
            }
            return EventDetailsScreen(eventId: eventId);
          case ProgramsScreen.routeName:
            return const ProgramsScreen();
          case ProgramDetailsScreen.routeName:
            final programId = settings.arguments as String?;
            if (programId == null || programId.isEmpty) {
              return const Scaffold(
                body: Center(child: Text('Missing program ID')),
              );
            }
            return ProgramDetailsScreen(programId: programId);
          case MentorshipScreen.routeName:
            return const MentorshipScreen();
          case MentorshipDetailsScreen.routeName:
            final classId = settings.arguments as String?;
            if (classId == null || classId.isEmpty) {
              return const Scaffold(
                body: Center(child: Text('Missing mentorship class ID')),
              );
            }
            return MentorshipDetailsScreen(classId: classId);
          case AnnouncementsScreen.routeName:
            return const AnnouncementsScreen();
          case AnnouncementDetailsScreen.routeName:
            final announcementId = settings.arguments as String?;
            if (announcementId == null || announcementId.isEmpty) {
              return const Scaffold(
                body: Center(child: Text('Missing announcement ID')),
              );
            }
            return AnnouncementDetailsScreen(announcementId: announcementId);
          case ProfileScreen.routeName:
            return const ProfileScreen();
          case PolicyScreen.routeName:
            final policyType = settings.arguments as String?;
            if (policyType == null || policyType.isEmpty) {
              return const Scaffold(
                body: Center(child: Text('Missing policy type')),
              );
            }
            return PolicyScreen(policyType: policyType);
          case TermsOfUseScreen.routeName:
            return const TermsOfUseScreen();
          case PrivacyPolicyScreen.routeName:
            return const PrivacyPolicyScreen();
          case CommunityGuidelinesScreen.routeName:
            return const CommunityGuidelinesScreen();
          case ContentSharingRulesScreen.routeName:
            return const ContentSharingRulesScreen();
          case EbookScreen.routeName:
            return const EbookScreen();
          case EbookDetailsScreen.routeName:
            final ebookId = settings.arguments as String?;
            if (ebookId == null || ebookId.isEmpty) {
              return const Scaffold(
                body: Center(child: Text('Missing eBook ID')),
              );
            }
            return EbookDetailsScreen(ebookId: ebookId);
          case ClipsScreen.routeName:
            return const ClipsScreen();
          case ClipDetailsScreen.routeName:
            final clipId = settings.arguments as String?;
            if (clipId == null || clipId.isEmpty) {
              return const Scaffold(
                body: Center(child: Text('Missing clip ID')),
              );
            }
            return ClipDetailsScreen(clipId: clipId);
          case MyLibraryScreen.routeName:
            return const MyLibraryScreen();
          case SubscriptionScreen.routeName:
            return const SubscriptionScreen();
          case PdfReaderScreen.routeName:
            final args = settings.arguments as PdfReaderArgs?;
            if (args == null) {
              return const Scaffold(
                body: Center(child: Text('Missing reader arguments')),
              );
            }
            return PdfReaderScreen(args: args);
          case '/':
          default:
            return DashboardScreen(
              authStatusLabel: authState.status == AuthStatus.authenticated
                  ? 'Authenticated'
                  : 'Unknown',
              authError: authState.errorMessage,
            );
        }
      },
    );
  }
}
