import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventLocationType, EventRsvpStatus } from '@prisma/client';
import { EventsService } from './events.service';

const event = {
  id: 'event-1',
  title: 'Prayer Night',
  slug: 'prayer-night',
  description: 'A night of prayer.',
  category: 'PRAYER',
  bannerImageUrl: 'https://cdn.example.com/events/prayer.jpg',
  locationType: EventLocationType.HYBRID,
  venue: 'Main Auditorium',
  meetingLink: 'https://example.com/meeting',
  startDateTime: new Date('2026-07-01T18:00:00.000Z'),
  endDateTime: new Date('2026-07-01T20:00:00.000Z'),
  registrationRequired: true,
  maxCapacity: 50,
  featured: true,
  published: true,
  createdAt: new Date('2026-06-10T10:00:00.000Z'),
  updatedAt: new Date('2026-06-10T10:00:00.000Z'),
  _count: { attendees: 3 },
};

function createService() {
  const prisma = {
    $transaction: jest.fn().mockImplementation((operations) => Promise.all(operations)),
    event: {
      findMany: jest.fn().mockResolvedValue([event]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(event),
      create: jest.fn().mockResolvedValue(event),
      update: jest.fn().mockResolvedValue(event),
      delete: jest.fn().mockResolvedValue(event),
    },
    eventAttendee: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({
        id: 'attendee-1',
        status: EventRsvpStatus.REGISTERED,
        registeredAt: new Date('2026-06-10T10:00:00.000Z'),
        cancelledAt: null,
        event,
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'attendee-1',
        status: EventRsvpStatus.REGISTERED,
      }),
      update: jest.fn().mockResolvedValue({ id: 'attendee-1' }),
    },
  };

  return {
    service: new EventsService(prisma as never),
    prisma,
  };
}

describe('EventsService', () => {
  it('lists published public events with search, category, featured, and pagination filters', async () => {
    const { service, prisma } = createService();

    await expect(
      service.listPublic({
        search: 'prayer',
        category: 'PRAYER',
        featured: true,
        limit: 10,
        offset: 5,
      }),
    ).resolves.toMatchObject({
      total: 1,
      limit: 10,
      offset: 5,
      data: [
        expect.objectContaining({
          id: 'event-1',
          slug: 'prayer-night',
          attendeeCount: 3,
          published: true,
        }),
      ],
    });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          published: true,
          featured: true,
        }),
        skip: 5,
        take: 10,
      }),
    );
  });

  it('creates events with generated slugs and validated date ranges', async () => {
    const { service, prisma } = createService();

    await service.create({
      title: 'Prayer Night',
      description: 'A night of prayer.',
      category: 'prayer',
      locationType: EventLocationType.HYBRID,
      venue: 'Main Auditorium',
      meetingLink: 'https://example.com/meeting',
      startDateTime: '2026-07-01T18:00:00.000Z',
      endDateTime: '2026-07-01T20:00:00.000Z',
      registrationRequired: true,
      maxCapacity: 50,
      featured: true,
      published: true,
    });

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'prayer-night',
          category: 'PRAYER',
          locationType: EventLocationType.HYBRID,
          registrationRequired: true,
          published: true,
        }),
      }),
    );
  });

  it('generates slug from title when slug is omitted', async () => {
    const { service, prisma } = createService();

    await service.create({
      title: 'Youth Conference 2026',
      locationType: EventLocationType.PHYSICAL,
      startDateTime: '2026-08-01T18:00:00.000Z',
      endDateTime: '2026-08-01T20:00:00.000Z',
    });

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'youth-conference-2026',
        }),
      }),
    );
  });

  it('slugifies provided custom slugs and appends suffixes for duplicates', async () => {
    const { service, prisma } = createService();
    prisma.event.findFirst
      .mockResolvedValueOnce({ id: 'existing-event', slug: 'custom-slug' })
      .mockResolvedValueOnce(null);

    await service.create({
      title: 'Another Event',
      slug: 'Custom Slug!',
      locationType: EventLocationType.ONLINE,
      startDateTime: '2026-08-01T18:00:00.000Z',
      endDateTime: '2026-08-01T20:00:00.000Z',
    });

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'custom-slug-2',
        }),
      }),
    );
  });

  it('updates slug when title changes', async () => {
    const { service, prisma } = createService();

    await service.update('event-1', { title: 'Updated Prayer Night' });

    expect(prisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Updated Prayer Night',
          slug: 'updated-prayer-night',
        }),
      }),
    );
  });

  it('rejects invalid date ranges', async () => {
    const { service } = createService();

    await expect(
      service.create({
        title: 'Invalid Event',
        locationType: EventLocationType.PHYSICAL,
        startDateTime: '2026-07-01T20:00:00.000Z',
        endDateTime: '2026-07-01T18:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('registers RSVP attendees while respecting capacity', async () => {
    const { service, prisma } = createService();
    prisma.event.findFirst.mockResolvedValueOnce({ ...event, _count: undefined });

    await expect(service.rsvp('event-1', 'user-1')).resolves.toMatchObject({
      data: expect.objectContaining({
        id: 'attendee-1',
        status: EventRsvpStatus.REGISTERED,
      }),
    });

    expect(prisma.eventAttendee.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId_userId: { eventId: 'event-1', userId: 'user-1' } },
      }),
    );
  });

  it('rejects RSVP when capacity is full', async () => {
    const { service, prisma } = createService();
    prisma.event.findFirst.mockResolvedValueOnce({ ...event, _count: undefined, maxCapacity: 3 });
    prisma.eventAttendee.count.mockResolvedValueOnce(3);

    await expect(service.rsvp('event-1', 'user-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('cancels RSVP idempotently and returns updated event payload', async () => {
    const { service, prisma } = createService();
    prisma.event.findFirst
      .mockResolvedValueOnce({ ...event, _count: undefined })
      .mockResolvedValueOnce(event);

    await expect(service.cancelRsvp('event-1', 'user-1')).resolves.toMatchObject({
      data: expect.objectContaining({
        status: EventRsvpStatus.CANCELLED,
        event: expect.objectContaining({
          id: 'event-1',
          attendeeCount: 3,
        }),
      }),
    });
    expect(prisma.eventAttendee.update).toHaveBeenCalledWith({
      where: { id: 'attendee-1' },
      data: expect.objectContaining({
        status: EventRsvpStatus.CANCELLED,
        cancelledAt: expect.any(Date),
      }),
    });
  });

  it('returns RSVP status for the current user', async () => {
    const { service, prisma } = createService();
    prisma.event.findFirst.mockResolvedValueOnce({ ...event, _count: undefined });
    prisma.eventAttendee.findUnique.mockResolvedValueOnce({
      eventId: 'event-1',
      status: EventRsvpStatus.REGISTERED,
      registeredAt: new Date('2026-06-10T10:00:00.000Z'),
      cancelledAt: null,
    });

    await expect(service.getMyRsvp('prayer-night', 'user-1')).resolves.toEqual({
      data: {
        eventId: 'event-1',
        status: EventRsvpStatus.REGISTERED,
        registeredAt: new Date('2026-06-10T10:00:00.000Z'),
        cancelledAt: null,
      },
    });
  });

  it('returns null RSVP status when the user has never registered', async () => {
    const { service, prisma } = createService();
    prisma.event.findFirst.mockResolvedValueOnce({ ...event, _count: undefined });
    prisma.eventAttendee.findUnique.mockResolvedValueOnce(null);

    await expect(service.getMyRsvp('event-1', 'user-1')).resolves.toEqual({
      data: {
        eventId: 'event-1',
        status: null,
        registeredAt: null,
        cancelledAt: null,
      },
    });
  });

  it('lists RSVP statuses for the current user', async () => {
    const { service, prisma } = createService();
    prisma.eventAttendee.findMany.mockResolvedValueOnce([
      {
        eventId: 'event-1',
        status: EventRsvpStatus.REGISTERED,
        registeredAt: new Date('2026-06-10T10:00:00.000Z'),
        cancelledAt: null,
      },
    ]);

    await expect(service.listMyRsvps('user-1')).resolves.toEqual({
      data: [
        {
          eventId: 'event-1',
          status: EventRsvpStatus.REGISTERED,
          registeredAt: new Date('2026-06-10T10:00:00.000Z'),
          cancelledAt: null,
        },
      ],
    });
  });
});
