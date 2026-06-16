import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { UsersController } from '../modules/users/users.controller';
import { ClipsController } from '../modules/clips/clips.controller';
import { EventsController } from '../modules/events/events.controller';
import { PoliciesController } from '../modules/policies/policies.controller';
import { ProgramsController } from '../modules/programs/programs.controller';
import { MentorshipController } from '../modules/mentorship/mentorship.controller';
import { PaymentsController } from '../modules/payments/payments.controller';
import { AnalyticsController } from '../modules/analytics/analytics.controller';
import { AnnouncementsController } from '../modules/announcements/announcements.controller';
import { NotificationsController } from '../modules/notifications/notifications.controller';

type ControllerClass = new (...args: never[]) => unknown;

function classGuards(controller: ControllerClass) {
  return Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
}

function methodGuards(controller: ControllerClass, method: string) {
  return Reflect.getMetadata(GUARDS_METADATA, controller.prototype[method]) ?? [];
}

function methodRoles(controller: ControllerClass, method: string) {
  return Reflect.getMetadata(ROLES_KEY, controller.prototype[method]) ?? [];
}

function expectClassProtected(controller: ControllerClass) {
  const guards = classGuards(controller);
  expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
}

function expectMethodProtected(controller: ControllerClass, method: string) {
  const guards = methodGuards(controller, method);
  expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
}

describe('route security metadata', () => {
  it('protects scaffold and operational controllers with auth + RBAC guards', () => {
    [
      UsersController,
      AnalyticsController,
      NotificationsController,
    ].forEach(expectClassProtected);
  });

  it('restricts user management routes by role and ownership-capable service paths', () => {
    expect(methodRoles(UsersController, 'findAll')).toEqual(['ADMIN']);
    expect(methodRoles(UsersController, 'findOne')).toEqual(['USER']);
    expect(methodRoles(UsersController, 'updateProfile')).toEqual(['USER']);
    expect(methodRoles(UsersController, 'updateRole')).toEqual(['ADMIN']);
    expect(methodRoles(UsersController, 'updateStatus')).toEqual(['ADMIN']);
  });

  it('requires moderator-or-higher access for content mutations', () => {
    ['listAdmin', 'findAdminById', 'create', 'update', 'publish', 'unpublish', 'remove'].forEach((method) => {
      expectMethodProtected(ClipsController, method);
      expect(methodRoles(ClipsController, method)).toEqual(['MODERATOR']);
    });
    ['listAdmin', 'findAdminById', 'listAttendees', 'create', 'update', 'publish', 'unpublish', 'remove'].forEach((method) => {
      expectMethodProtected(EventsController, method);
      expect(methodRoles(EventsController, method)).toEqual(['MODERATOR']);
    });
    ['rsvp', 'cancelRsvp'].forEach((method) => {
      expectMethodProtected(EventsController, method);
      expect(methodRoles(EventsController, method)).toEqual(['USER']);
    });
    ['listAdmin', 'findAdminById', 'listEnrollments', 'listProgramProgress', 'adminAnalytics', 'create', 'update', 'publish', 'unpublish', 'remove'].forEach((method) => {
      expectMethodProtected(ProgramsController, method);
      expect(methodRoles(ProgramsController, method)).toEqual(['MODERATOR']);
    });
    ['enroll', 'cancelEnrollment', 'listMyEnrollments', 'getMyProgress', 'updateMyProgress'].forEach((method) => {
      expectMethodProtected(ProgramsController, method);
      expect(methodRoles(ProgramsController, method)).toEqual(['USER']);
    });
    ['listAdmin', 'findAdminById', 'listParticipants', 'listSessions', 'listFeedback', 'listClassProgress', 'adminAnalytics', 'create', 'update', 'publish', 'unpublish', 'remove', 'createSession', 'updateSession', 'removeSession', 'listSessionAttendance', 'markAttendance'].forEach((method) => {
      expectMethodProtected(MentorshipController, method);
      expect(methodRoles(MentorshipController, method)).toEqual(['MODERATOR']);
    });
    ['enroll', 'cancelEnrollment', 'listMyEnrollments', 'getMyAttendance', 'getMyProgress', 'updateMyProgress', 'submitFeedback'].forEach((method) => {
      expectMethodProtected(MentorshipController, method);
      expect(methodRoles(MentorshipController, method)).toEqual(['USER']);
    });
    ['getAcceptanceStatus', 'acceptPolicy'].forEach((method) => {
      expectMethodProtected(PoliciesController, method);
      expect(methodRoles(PoliciesController, method)).toEqual(['USER']);
    });
    ['listAdmin', 'findAdminById', 'listVersionHistory', 'getAcceptanceAnalytics', 'getPublishReadiness', 'create', 'update', 'publish', 'unpublish', 'remove'].forEach((method) => {
      expectMethodProtected(PoliciesController, method);
      expect(methodRoles(PoliciesController, method)).toEqual(['MODERATOR']);
    });
  });

  it('keeps analytics, payments webhook, announcements admin, and notifications admin routes role-scoped', () => {
    ['initiateSubscriptionCheckout', 'initiateEbookCheckout', 'status', 'history', 'webhookEvents'].forEach((method) => {
      expectMethodProtected(PaymentsController, method);
    });
    expect(methodRoles(PaymentsController, 'webhookEvents')).toEqual(['ADMIN']);
    expect(methodRoles(PaymentsController, 'webhook')).toEqual([]);
    ['summary', 'report', 'operational', 'dashboard', 'growth', 'activity', 'topContent'].forEach((method) => {
      expect(methodRoles(AnalyticsController, method)).toEqual(['SUPER_ADMIN', 'ADMIN']);
    });

    ['listAdmin', 'findAdminById', 'listAdminCategories', 'create', 'update', 'publish', 'unpublish', 'remove', 'uploadImage'].forEach((method) => {
      expectMethodProtected(AnnouncementsController, method);
      expect(methodRoles(AnnouncementsController, method)).toEqual(['ADMIN', 'SUPER_ADMIN']);
    });

    expect(methodRoles(NotificationsController, 'createBroadcast')).toEqual(['SUPER_ADMIN', 'ADMIN']);
    expect(methodRoles(NotificationsController, 'createTargeted')).toEqual(['SUPER_ADMIN', 'ADMIN']);
  });
});
