import { BadRequestException, ConflictException } from '@nestjs/common';
import { MentorshipParticipantStatus } from '@prisma/client';
import { MentorshipService } from './mentorship.service';

const mentorshipClass = {
  id: 'class-1',
  title: 'Leadership Mentorship',
  slug: 'leadership-mentorship',
  description: 'One-on-one leadership mentoring.',
  category: 'LEADERSHIP',
  bannerImageUrl: 'https://cdn.example.com/mentorship/leadership.jpg',
  mentorName: 'Pastor John',
  mentorBio: '20 years of pastoral leadership experience.',
  mentorImageUrl: 'https://cdn.example.com/mentors/john.jpg',
  startDate: new Date('2026-09-01T09:00:00.000Z'),
  endDate: new Date('2026-12-01T17:00:00.000Z'),
  registrationDeadline: new Date('2026-08-25T23:59:59.000Z'),
  capacity: 10,
  enrolledCount: 4,
  waitlistCount: 1,
  featured: true,
  published: true,
  createdAt: new Date('2026-06-10T10:00:00.000Z'),
  updatedAt: new Date('2026-06-10T10:00:00.000Z'),
  _count: { participants: 4, sessions: 2, feedback: 1 },
};

function createService() {
  const prisma = {
    $transaction: jest.fn().mockImplementation((operations) => {
      if (typeof operations === 'function') {
        return operations(prisma);
      }
      return Promise.all(operations);
    }),
    mentorshipClass: {
      findMany: jest.fn().mockResolvedValue([mentorshipClass]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(mentorshipClass),
      create: jest.fn().mockResolvedValue(mentorshipClass),
      update: jest.fn().mockResolvedValue(mentorshipClass),
    },
    mentorshipClassParticipant: {
      count: jest.fn().mockResolvedValue(4),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({
        id: 'participant-1',
        status: MentorshipParticipantStatus.ENROLLED,
        joinedAt: new Date('2026-06-10T10:00:00.000Z'),
        waitlistedAt: null,
        cancelledAt: null,
      }),
      update: jest.fn().mockResolvedValue({ id: 'participant-1' }),
    },
    mentorshipSession: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'session-1',
        mentorshipClassId: 'class-1',
        title: 'Kickoff',
        description: null,
        scheduledAt: new Date('2026-09-05T10:00:00.000Z'),
        durationMinutes: 60,
        meetingLink: null,
        location: 'Room A',
        sortOrder: 0,
        createdAt: new Date('2026-06-10T10:00:00.000Z'),
        updatedAt: new Date('2026-06-10T10:00:00.000Z'),
      }),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mentorshipAttendance: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
    mentorshipFeedback: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.5 } }),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
    mentorshipProgress: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { completionPct: 35 } }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
  };

  return {
    service: new MentorshipService(prisma as never),
    prisma,
  };
}

describe('MentorshipService', () => {
  it('lists published mentorship classes with search and pagination', async () => {
    const { service, prisma } = createService();

    await expect(
      service.listPublic({
        search: 'leadership',
        category: 'LEADERSHIP',
        limit: 10,
        offset: 0,
      }),
    ).resolves.toMatchObject({
      total: 1,
      data: [
        expect.objectContaining({
          id: 'class-1',
          slug: 'leadership-mentorship',
          enrolledCount: 4,
        }),
      ],
    });

    expect(prisma.mentorshipClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ published: true, deletedAt: null }),
        take: 10,
      }),
    );
  });

  it('creates mentorship classes with generated slugs', async () => {
    const { service, prisma } = createService();
    prisma.mentorshipClass.findFirst.mockResolvedValue(null);

    await service.create({
      title: 'Youth Mentorship',
      startDate: '2026-10-01T09:00:00.000Z',
      endDate: '2026-12-01T17:00:00.000Z',
      mentorName: 'Jane Doe',
    });

    expect(prisma.mentorshipClass.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'youth-mentorship',
          mentorName: 'Jane Doe',
        }),
      }),
    );
  });

  it('rejects invalid date ranges', async () => {
    const { service } = createService();

    await expect(
      service.create({
        title: 'Invalid',
        startDate: '2026-12-01T17:00:00.000Z',
        endDate: '2026-10-01T09:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enrolls users when capacity allows', async () => {
    const { service, prisma } = createService();
    prisma.mentorshipClass.findFirst.mockResolvedValue(mentorshipClass);

    const result = await service.enroll('class-1', 'user-1');
    expect(result.data.status).toBe(MentorshipParticipantStatus.ENROLLED);
    expect(prisma.mentorshipClassParticipant.upsert).toHaveBeenCalled();
  });

  it('waitlists users when capacity is full', async () => {
    const { service, prisma } = createService();
    prisma.mentorshipClass.findFirst.mockResolvedValue({
      ...mentorshipClass,
      capacity: 10,
      enrolledCount: 10,
    });
    prisma.mentorshipClassParticipant.upsert.mockResolvedValue({
      id: 'participant-2',
      status: MentorshipParticipantStatus.WAITLISTED,
      joinedAt: new Date('2026-06-10T10:00:00.000Z'),
      waitlistedAt: new Date('2026-06-10T10:00:00.000Z'),
      cancelledAt: null,
    });

    const result = await service.enroll('class-1', 'user-2');
    expect(result.data.status).toBe(MentorshipParticipantStatus.WAITLISTED);
  });

  it('blocks duplicate enrollment', async () => {
    const { service, prisma } = createService();
    prisma.mentorshipClass.findFirst.mockResolvedValue(mentorshipClass);
    prisma.mentorshipClassParticipant.findUnique.mockResolvedValue({
      id: 'participant-1',
      status: MentorshipParticipantStatus.ENROLLED,
    });

    await expect(service.enroll('class-1', 'user-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns admin analytics summary', async () => {
    const { service } = createService();

    await expect(service.adminAnalytics()).resolves.toMatchObject({
      data: expect.objectContaining({
        totalClasses: 1,
        publishedClasses: 1,
        activeParticipants: 4,
        totalSessions: 2,
        averageRating: 4.5,
        averageCompletionPct: 35,
      }),
    });
  });
});
