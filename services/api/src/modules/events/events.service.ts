import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventLocationType, EventRsvpStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { UpdateEventDto } from './dto/update-event.dto';

type EventWithCounts = Prisma.EventGetPayload<{
  include: { _count: { select: { attendees: true } } };
}>;

type EventWithAttendees = Prisma.EventGetPayload<{
  include: {
    _count: { select: { attendees: true } };
    attendees: {
      include: {
        user: { select: { id: true; fullName: true; email: true; role: true } };
      };
    };
  };
}>;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(query: EventQueryDto) {
    return this.listEvents(query, { published: true });
  }

  async listFeatured(query: EventQueryDto) {
    return this.listEvents({ ...query, featured: true }, { published: true });
  }

  async listAdmin(query: EventQueryDto) {
    return this.listEvents(query, {});
  }

  async findPublicBySlugOrId(slugOrId: string) {
    const event = await this.findEventWithCounts({
      published: true,
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return { data: this.toResponse(event) };
  }

  async findAdminById(id: string) {
    const event = await this.findEventWithCounts({ id });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return { data: this.toResponse(event) };
  }

  async listAttendees(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        _count: { select: { attendees: { where: { status: EventRsvpStatus.REGISTERED } } } },
        attendees: {
          orderBy: [{ registeredAt: 'desc' }],
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true } },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      data: this.toResponse(event),
      attendees: event.attendees.map((attendee) => ({
        id: attendee.id,
        status: attendee.status,
        registeredAt: attendee.registeredAt,
        cancelledAt: attendee.cancelledAt,
        user: attendee.user,
      })),
    };
  }

  async create(dto: CreateEventDto) {
    this.assertDateRange(dto.startDateTime, dto.endDateTime);
    const slug = await this.resolveUniqueSlug({
      preferredSlug: dto.slug,
      title: dto.title,
    });

    const created = await this.prisma.event.create({
      data: this.toCreateInput(dto, slug),
      include: { _count: { select: { attendees: { where: { status: EventRsvpStatus.REGISTERED } } } } },
    });

    return { data: this.toResponse(created) };
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.ensureEvent(id);
    const startDateTime = dto.startDateTime ?? existing.startDateTime.toISOString();
    const endDateTime = dto.endDateTime ?? existing.endDateTime.toISOString();
    this.assertDateRange(startDateTime, endDateTime);

    const slug =
      dto.slug !== undefined || dto.title !== undefined
        ? await this.resolveUniqueSlug({
            preferredSlug: dto.slug,
            title: dto.title ?? existing.title,
            ignoreId: id,
          })
        : undefined;

    const updated = await this.prisma.event.update({
      where: { id },
      data: this.toUpdateInput(dto, slug),
      include: { _count: { select: { attendees: { where: { status: EventRsvpStatus.REGISTERED } } } } },
    });

    return { data: this.toResponse(updated) };
  }

  async publish(id: string) {
    await this.ensureEvent(id);
    const updated = await this.prisma.event.update({
      where: { id },
      data: { published: true },
      include: { _count: { select: { attendees: { where: { status: EventRsvpStatus.REGISTERED } } } } },
    });

    return { data: this.toResponse(updated) };
  }

  async unpublish(id: string) {
    await this.ensureEvent(id);
    const updated = await this.prisma.event.update({
      where: { id },
      data: { published: false },
      include: { _count: { select: { attendees: { where: { status: EventRsvpStatus.REGISTERED } } } } },
    });

    return { data: this.toResponse(updated) };
  }

  async remove(id: string) {
    await this.ensureEvent(id);
    await this.prisma.event.delete({ where: { id } });
    return { success: true };
  }

  async rsvp(id: string, userId: string) {
    const event = await this.ensurePublicEvent(id);
    if (!event.registrationRequired) {
      throw new BadRequestException('This event does not require RSVP registration');
    }

    if (event.maxCapacity !== null) {
      const activeCount = await this.prisma.eventAttendee.count({
        where: { eventId: event.id, status: EventRsvpStatus.REGISTERED },
      });
      if (activeCount >= event.maxCapacity) {
        throw new ConflictException('Event capacity has been reached');
      }
    }

    const attendee = await this.prisma.eventAttendee.upsert({
      where: { eventId_userId: { eventId: event.id, userId } },
      update: {
        status: EventRsvpStatus.REGISTERED,
        registeredAt: new Date(),
        cancelledAt: null,
      },
      create: {
        eventId: event.id,
        userId,
        status: EventRsvpStatus.REGISTERED,
      },
      include: {
        event: { include: { _count: { select: { attendees: { where: { status: EventRsvpStatus.REGISTERED } } } } } },
      },
    });

    return {
      data: {
        id: attendee.id,
        status: attendee.status,
        registeredAt: attendee.registeredAt,
        cancelledAt: attendee.cancelledAt,
        event: this.toResponse(attendee.event),
      },
    };
  }

  async cancelRsvp(id: string, userId: string) {
    const event = await this.ensurePublicEvent(id);
    const attendee = await this.prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId: event.id, userId } },
    });

    if (!attendee || attendee.status === EventRsvpStatus.CANCELLED) {
      return { success: true };
    }

    await this.prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: {
        status: EventRsvpStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return { success: true };
  }

  private async listEvents(query: EventQueryDto, fixedWhere: Prisma.EventWhereInput) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.EventWhereInput = {
      ...fixedWhere,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { venue: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(typeof query.featured === 'boolean' ? { featured: query.featured } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { startDateTime: 'asc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: { _count: { select: { attendees: { where: { status: EventRsvpStatus.REGISTERED } } } } },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      total,
      limit,
      offset,
    };
  }

  private async ensureEvent(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  private async ensurePublicEvent(slugOrId: string) {
    const event = await this.prisma.event.findFirst({
      where: { published: true, OR: [{ id: slugOrId }, { slug: slugOrId }] },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  private findEventWithCounts(where: Prisma.EventWhereInput) {
    return this.prisma.event.findFirst({
      where,
      include: { _count: { select: { attendees: { where: { status: EventRsvpStatus.REGISTERED } } } } },
    });
  }

  private assertDateRange(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
      throw new BadRequestException('Event dates are invalid');
    }
    if (endDate <= startDate) {
      throw new BadRequestException('Event end date must be after start date');
    }
  }

  private toCreateInput(dto: CreateEventDto, slug: string): Prisma.EventCreateInput {
    return {
      title: dto.title,
      slug,
      description: dto.description,
      category: dto.category?.trim().toUpperCase() ?? 'GENERAL',
      bannerImageUrl: dto.bannerImageUrl,
      locationType: dto.locationType,
      venue: dto.venue,
      meetingLink: dto.meetingLink,
      startDateTime: new Date(dto.startDateTime),
      endDateTime: new Date(dto.endDateTime),
      registrationRequired: dto.registrationRequired ?? false,
      maxCapacity: dto.maxCapacity,
      featured: dto.featured ?? false,
      published: dto.published ?? false,
    };
  }

  private toUpdateInput(dto: UpdateEventDto, slug?: string): Prisma.EventUpdateInput {
    return {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.category !== undefined ? { category: dto.category.trim().toUpperCase() } : {}),
      ...(dto.bannerImageUrl !== undefined ? { bannerImageUrl: dto.bannerImageUrl } : {}),
      ...(dto.locationType !== undefined ? { locationType: dto.locationType } : {}),
      ...(dto.venue !== undefined ? { venue: dto.venue } : {}),
      ...(dto.meetingLink !== undefined ? { meetingLink: dto.meetingLink } : {}),
      ...(dto.startDateTime !== undefined ? { startDateTime: new Date(dto.startDateTime) } : {}),
      ...(dto.endDateTime !== undefined ? { endDateTime: new Date(dto.endDateTime) } : {}),
      ...(dto.registrationRequired !== undefined
        ? { registrationRequired: dto.registrationRequired }
        : {}),
      ...(dto.maxCapacity !== undefined ? { maxCapacity: dto.maxCapacity } : {}),
      ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
      ...(dto.published !== undefined ? { published: dto.published } : {}),
    };
  }

  private async resolveUniqueSlug(options: {
    preferredSlug?: string;
    title: string;
    ignoreId?: string;
  }) {
    const source = options.preferredSlug?.trim() || options.title;
    const base = this.slugify(source);
    let candidate = base;
    let suffix = 2;

    while (
      await this.prisma.event.findFirst({
        where: {
          slug: candidate,
          ...(options.ignoreId ? { id: { not: options.ignoreId } } : {}),
        },
      })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || `event-${Date.now()}`;
  }

  private toResponse(event: EventWithCounts | EventWithAttendees) {
    const registeredCount =
      'attendees' in event
        ? event.attendees.filter((attendee) => attendee.status === EventRsvpStatus.REGISTERED)
            .length
        : event._count.attendees;

    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      category: event.category,
      bannerImageUrl: event.bannerImageUrl,
      locationType: event.locationType as EventLocationType,
      venue: event.venue,
      meetingLink: event.meetingLink,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      registrationRequired: event.registrationRequired,
      maxCapacity: event.maxCapacity,
      attendeeCount: registeredCount,
      featured: event.featured,
      published: event.published,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
