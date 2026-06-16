import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MentorshipAttendanceStatus,
  MentorshipParticipantStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMentorshipDto } from './dto/create-mentorship.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { MentorshipQueryDto } from './dto/mentorship-query.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { UpdateMentorshipDto } from './dto/update-mentorship.dto';
import { UpdateMentorshipProgressDto } from './dto/update-mentorship-progress.dto';

type ClassWithCounts = Prisma.MentorshipClassGetPayload<{
  include: {
    _count: {
      select: {
        participants: true;
        sessions: true;
        feedback: true;
      };
    };
  };
}>;

@Injectable()
export class MentorshipService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(query: MentorshipQueryDto) {
    return this.listClasses(query, { published: true, deletedAt: null });
  }

  async listFeatured(query: MentorshipQueryDto) {
    return this.listClasses({ ...query, featured: true }, { published: true, deletedAt: null });
  }

  async listAdmin(query: MentorshipQueryDto) {
    return this.listClasses(query, { deletedAt: null });
  }

  async listMentors(query: MentorshipQueryDto) {
    const classes = await this.prisma.mentorshipClass.findMany({
      where: {
        published: true,
        deletedAt: null,
        mentorName: { not: null },
        ...(query.search
          ? {
              OR: [
                { mentorName: { contains: query.search, mode: 'insensitive' } },
                { mentorBio: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ mentorName: 'asc' }],
      distinct: ['mentorName'],
      take: query.limit ?? 20,
      skip: query.offset ?? 0,
    });

    return {
      data: classes.map((item) => this.toMentorProfile(item)),
      total: classes.length,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    };
  }

  async findPublicBySlugOrId(slugOrId: string) {
    const mentorshipClass = await this.findClassWithCounts({
      published: true,
      deletedAt: null,
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    });
    if (!mentorshipClass) {
      throw new NotFoundException('Mentorship class not found');
    }
    return { data: this.toResponse(mentorshipClass) };
  }

  async listPublicSessions(slugOrId: string) {
    const mentorshipClass = await this.ensurePublicClass(slugOrId);
    const sessions = await this.prisma.mentorshipSession.findMany({
      where: { mentorshipClassId: mentorshipClass.id },
      orderBy: [{ sortOrder: 'asc' }, { scheduledAt: 'asc' }],
    });
    return {
      data: sessions.map((session) => this.toSessionResponse(session)),
    };
  }

  async findAdminById(id: string) {
    const mentorshipClass = await this.findClassWithCounts({ id, deletedAt: null });
    if (!mentorshipClass) {
      throw new NotFoundException('Mentorship class not found');
    }
    return { data: this.toResponse(mentorshipClass) };
  }

  async adminAnalytics() {
    const [
      totalClasses,
      publishedClasses,
      activeParticipants,
      waitlistedParticipants,
      totalSessions,
      avgRating,
      avgCompletion,
    ] = await this.prisma.$transaction([
      this.prisma.mentorshipClass.count({ where: { deletedAt: null } }),
      this.prisma.mentorshipClass.count({ where: { deletedAt: null, published: true } }),
      this.prisma.mentorshipClassParticipant.count({
        where: { status: MentorshipParticipantStatus.ENROLLED },
      }),
      this.prisma.mentorshipClassParticipant.count({
        where: { status: MentorshipParticipantStatus.WAITLISTED },
      }),
      this.prisma.mentorshipSession.count(),
      this.prisma.mentorshipFeedback.aggregate({ _avg: { rating: true } }),
      this.prisma.mentorshipProgress.aggregate({ _avg: { completionPct: true } }),
    ]);

    return {
      data: {
        totalClasses,
        publishedClasses,
        activeParticipants,
        waitlistedParticipants,
        totalSessions,
        averageRating: avgRating._avg.rating ?? 0,
        averageCompletionPct: avgCompletion._avg.completionPct ?? 0,
      },
    };
  }

  async listParticipants(id: string) {
    const mentorshipClass = await this.prisma.mentorshipClass.findFirst({
      where: { id, deletedAt: null },
      include: {
        participants: {
          orderBy: [{ joinedAt: 'asc' }],
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true } },
          },
        },
      },
    });
    if (!mentorshipClass) {
      throw new NotFoundException('Mentorship class not found');
    }
    return {
      data: this.toResponse(await this.findClassWithCounts({ id, deletedAt: null })),
      participants: mentorshipClass.participants.map((participant) =>
        this.toParticipantResponse(participant),
      ),
    };
  }

  async listSessions(id: string) {
    await this.ensureClass(id);
    const sessions = await this.prisma.mentorshipSession.findMany({
      where: { mentorshipClassId: id },
      orderBy: [{ sortOrder: 'asc' }, { scheduledAt: 'asc' }],
    });
    return { data: sessions.map((session) => this.toSessionResponse(session)) };
  }

  async listFeedback(id: string) {
    await this.ensureClass(id);
    const feedback = await this.prisma.mentorshipFeedback.findMany({
      where: { mentorshipClassId: id },
      orderBy: [{ submittedAt: 'desc' }],
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });
    return { data: feedback.map((item) => this.toFeedbackResponse(item)) };
  }

  async listClassProgress(id: string) {
    await this.ensureClass(id);
    const progress = await this.prisma.mentorshipProgress.findMany({
      where: { mentorshipClassId: id },
      orderBy: [{ lastUpdatedAt: 'desc' }],
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });
    return { data: progress.map((item) => this.toProgressResponse(item)) };
  }

  async create(dto: CreateMentorshipDto, createdById?: string) {
    this.assertDateRange(dto.startDate, dto.endDate);
    const slug = await this.resolveUniqueSlug({ preferredSlug: dto.slug, title: dto.title });
    const created = await this.prisma.mentorshipClass.create({
      data: this.toCreateInput(dto, slug, createdById),
      include: this.classCountInclude(),
    });
    return { data: this.toResponse(created) };
  }

  async update(id: string, dto: UpdateMentorshipDto) {
    const existing = await this.ensureClass(id);
    const startDate = dto.startDate ?? existing.startDate.toISOString();
    const endDate = dto.endDate ?? existing.endDate.toISOString();
    this.assertDateRange(startDate, endDate);
    const slug =
      dto.slug !== undefined || dto.title !== undefined
        ? await this.resolveUniqueSlug({
            preferredSlug: dto.slug,
            title: dto.title ?? existing.title,
            ignoreId: id,
          })
        : undefined;
    const updated = await this.prisma.mentorshipClass.update({
      where: { id },
      data: this.toUpdateInput(dto, slug),
      include: this.classCountInclude(),
    });
    return { data: this.toResponse(updated) };
  }

  async publish(id: string) {
    await this.ensureClass(id);
    const updated = await this.prisma.mentorshipClass.update({
      where: { id },
      data: { published: true },
      include: this.classCountInclude(),
    });
    return { data: this.toResponse(updated) };
  }

  async unpublish(id: string) {
    await this.ensureClass(id);
    const updated = await this.prisma.mentorshipClass.update({
      where: { id },
      data: { published: false },
      include: this.classCountInclude(),
    });
    return { data: this.toResponse(updated) };
  }

  async remove(id: string) {
    await this.ensureClass(id);
    await this.prisma.mentorshipClass.update({
      where: { id },
      data: { deletedAt: new Date(), published: false },
    });
    return { success: true };
  }

  async createSession(classId: string, dto: CreateSessionDto) {
    await this.ensureClass(classId);
    const session = await this.prisma.mentorshipSession.create({
      data: {
        mentorshipClassId: classId,
        title: dto.title,
        description: dto.description,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes ?? 60,
        meetingLink: dto.meetingLink,
        location: dto.location,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return { data: this.toSessionResponse(session) };
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto) {
    await this.ensureSession(sessionId);
    const session = await this.prisma.mentorshipSession.update({
      where: { id: sessionId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.scheduledAt !== undefined ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.meetingLink !== undefined ? { meetingLink: dto.meetingLink } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return { data: this.toSessionResponse(session) };
  }

  async removeSession(sessionId: string) {
    await this.ensureSession(sessionId);
    await this.prisma.mentorshipSession.delete({ where: { id: sessionId } });
    return { success: true };
  }

  async listSessionAttendance(sessionId: string) {
    const session = await this.prisma.mentorshipSession.findUnique({
      where: { id: sessionId },
      include: {
        attendances: {
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true } },
          },
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return {
      data: this.toSessionResponse(session),
      attendances: session.attendances.map((item) => this.toAttendanceResponse(item)),
    };
  }

  async markAttendance(sessionId: string, userId: string, dto: MarkAttendanceDto) {
    const session = await this.ensureSession(sessionId);
    const participant = await this.prisma.mentorshipClassParticipant.findUnique({
      where: {
        mentorshipClassId_userId: {
          mentorshipClassId: session.mentorshipClassId,
          userId,
        },
      },
    });
    if (!participant || participant.status !== MentorshipParticipantStatus.ENROLLED) {
      throw new BadRequestException('User must be enrolled to mark attendance');
    }
    const attendance = await this.prisma.mentorshipAttendance.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: {
        status: dto.status,
        notes: dto.notes,
        markedAt: new Date(),
      },
      create: {
        sessionId,
        userId,
        status: dto.status,
        notes: dto.notes,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });
    return { data: this.toAttendanceResponse(attendance) };
  }

  async enroll(slugOrId: string, userId: string) {
    const mentorshipClass = await this.ensurePublicClass(slugOrId);
    this.assertEnrollmentWindow(mentorshipClass);

    const existing = await this.prisma.mentorshipClassParticipant.findUnique({
      where: {
        mentorshipClassId_userId: { mentorshipClassId: mentorshipClass.id, userId },
      },
    });
    if (existing?.status === MentorshipParticipantStatus.ENROLLED) {
      throw new ConflictException('Already enrolled in this mentorship class');
    }
    if (existing?.status === MentorshipParticipantStatus.WAITLISTED) {
      throw new ConflictException('Already on the waitlist for this mentorship class');
    }

    const atCapacity =
      mentorshipClass.capacity !== null &&
      mentorshipClass.enrolledCount >= mentorshipClass.capacity;
    const status = atCapacity
      ? MentorshipParticipantStatus.WAITLISTED
      : MentorshipParticipantStatus.ENROLLED;

    const participant = await this.prisma.$transaction(async (tx) => {
      const record = await tx.mentorshipClassParticipant.upsert({
        where: {
          mentorshipClassId_userId: { mentorshipClassId: mentorshipClass.id, userId },
        },
        update: {
          status,
          joinedAt: new Date(),
          waitlistedAt: status === MentorshipParticipantStatus.WAITLISTED ? new Date() : null,
          cancelledAt: null,
        },
        create: {
          mentorshipClassId: mentorshipClass.id,
          userId,
          status,
          waitlistedAt: status === MentorshipParticipantStatus.WAITLISTED ? new Date() : null,
        },
        include: {
          mentorshipClass: { include: this.classCountInclude() },
        },
      });

      await tx.mentorshipClass.update({
        where: { id: mentorshipClass.id },
        data: {
          ...(status === MentorshipParticipantStatus.ENROLLED
            ? { enrolledCount: { increment: 1 } }
            : { waitlistCount: { increment: 1 } }),
        },
      });

      if (status === MentorshipParticipantStatus.ENROLLED) {
        await tx.mentorshipProgress.upsert({
          where: {
            mentorshipClassId_userId: { mentorshipClassId: mentorshipClass.id, userId },
          },
          update: { lastUpdatedAt: new Date() },
          create: { mentorshipClassId: mentorshipClass.id, userId },
        });
      }

      return record;
    });

    return {
      data: this.toParticipantResponse(participant),
    };
  }

  async cancelEnrollment(slugOrId: string, userId: string) {
    const mentorshipClass = await this.ensurePublicClass(slugOrId);
    const participant = await this.prisma.mentorshipClassParticipant.findUnique({
      where: {
        mentorshipClassId_userId: { mentorshipClassId: mentorshipClass.id, userId },
      },
    });
    if (
      !participant ||
      participant.status === MentorshipParticipantStatus.CANCELLED
    ) {
      return { success: true };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.mentorshipClassParticipant.update({
        where: { id: participant.id },
        data: {
          status: MentorshipParticipantStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      if (participant.status === MentorshipParticipantStatus.ENROLLED) {
        await tx.mentorshipClass.update({
          where: { id: mentorshipClass.id },
          data: { enrolledCount: { decrement: 1 } },
        });
        await this.promoteWaitlisted(tx, mentorshipClass.id);
      } else {
        await tx.mentorshipClass.update({
          where: { id: mentorshipClass.id },
          data: { waitlistCount: { decrement: 1 } },
        });
      }
    });

    return { success: true };
  }

  async listMyEnrollments(userId: string) {
    const participants = await this.prisma.mentorshipClassParticipant.findMany({
      where: {
        userId,
        status: {
          in: [MentorshipParticipantStatus.ENROLLED, MentorshipParticipantStatus.WAITLISTED],
        },
      },
      orderBy: [{ joinedAt: 'desc' }],
      include: {
        mentorshipClass: { include: this.classCountInclude() },
      },
    });
    return {
      data: participants.map((participant) => ({
        ...this.toParticipantResponse(participant),
        mentorshipClass: this.toResponse(participant.mentorshipClass),
      })),
    };
  }

  async getMyAttendance(slugOrId: string, userId: string) {
    const mentorshipClass = await this.ensurePublicClass(slugOrId);
    const attendances = await this.prisma.mentorshipAttendance.findMany({
      where: {
        userId,
        session: { mentorshipClassId: mentorshipClass.id },
      },
      orderBy: [{ markedAt: 'desc' }],
      include: { session: true },
    });
    return {
      data: attendances.map((item) => ({
        ...this.toAttendanceResponse(item),
        session: this.toSessionResponse(item.session),
      })),
    };
  }

  async getMyProgress(slugOrId: string, userId: string) {
    const mentorshipClass = await this.ensurePublicClass(slugOrId);
    const progress = await this.prisma.mentorshipProgress.findUnique({
      where: {
        mentorshipClassId_userId: { mentorshipClassId: mentorshipClass.id, userId },
      },
    });
    if (!progress) {
      return {
        data: {
          mentorshipClassId: mentorshipClass.id,
          completionPct: 0,
          currentMilestone: null,
          notes: null,
          lastUpdatedAt: null,
        },
      };
    }
    return { data: this.toProgressResponse(progress) };
  }

  async updateMyProgress(
    slugOrId: string,
    userId: string,
    dto: UpdateMentorshipProgressDto,
  ) {
    const mentorshipClass = await this.ensurePublicClass(slugOrId);
    await this.ensureEnrolled(mentorshipClass.id, userId);
    const progress = await this.prisma.mentorshipProgress.upsert({
      where: {
        mentorshipClassId_userId: { mentorshipClassId: mentorshipClass.id, userId },
      },
      update: {
        ...(dto.completionPct !== undefined ? { completionPct: dto.completionPct } : {}),
        ...(dto.currentMilestone !== undefined ? { currentMilestone: dto.currentMilestone } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        lastUpdatedAt: new Date(),
      },
      create: {
        mentorshipClassId: mentorshipClass.id,
        userId,
        completionPct: dto.completionPct ?? 0,
        currentMilestone: dto.currentMilestone,
        notes: dto.notes,
      },
    });
    return { data: this.toProgressResponse(progress) };
  }

  async submitFeedback(slugOrId: string, userId: string, dto: SubmitFeedbackDto) {
    const mentorshipClass = await this.ensurePublicClass(slugOrId);
    await this.ensureEnrolled(mentorshipClass.id, userId);
    const feedback = await this.prisma.mentorshipFeedback.upsert({
      where: {
        mentorshipClassId_userId: { mentorshipClassId: mentorshipClass.id, userId },
      },
      update: {
        rating: dto.rating,
        comment: dto.comment,
        submittedAt: new Date(),
      },
      create: {
        mentorshipClassId: mentorshipClass.id,
        userId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
    return { data: this.toFeedbackResponse(feedback) };
  }

  private async listClasses(
    query: MentorshipQueryDto,
    fixedWhere: Prisma.MentorshipClassWhereInput,
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.MentorshipClassWhereInput = {
      ...fixedWhere,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { mentorName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(typeof query.featured === 'boolean' ? { featured: query.featured } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mentorshipClass.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { startDate: 'asc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: this.classCountInclude(),
      }),
      this.prisma.mentorshipClass.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      total,
      limit,
      offset,
    };
  }

  private async promoteWaitlisted(
    tx: Prisma.TransactionClient,
    mentorshipClassId: string,
  ) {
    const next = await tx.mentorshipClassParticipant.findFirst({
      where: { mentorshipClassId, status: MentorshipParticipantStatus.WAITLISTED },
      orderBy: [{ waitlistedAt: 'asc' }, { joinedAt: 'asc' }],
    });
    if (!next) return;

    await tx.mentorshipClassParticipant.update({
      where: { id: next.id },
      data: {
        status: MentorshipParticipantStatus.ENROLLED,
        waitlistedAt: null,
        joinedAt: new Date(),
      },
    });
    await tx.mentorshipClass.update({
      where: { id: mentorshipClassId },
      data: { enrolledCount: { increment: 1 }, waitlistCount: { decrement: 1 } },
    });
    await tx.mentorshipProgress.upsert({
      where: {
        mentorshipClassId_userId: { mentorshipClassId, userId: next.userId },
      },
      update: { lastUpdatedAt: new Date() },
      create: { mentorshipClassId, userId: next.userId },
    });
  }

  private classCountInclude(): Prisma.MentorshipClassInclude {
    return {
      _count: {
        select: {
          participants: {
            where: { status: MentorshipParticipantStatus.ENROLLED },
          },
          sessions: true,
          feedback: true,
        },
      },
    };
  }

  private async ensureClass(id: string) {
    const mentorshipClass = await this.prisma.mentorshipClass.findFirst({
      where: { id, deletedAt: null },
    });
    if (!mentorshipClass) {
      throw new NotFoundException('Mentorship class not found');
    }
    return mentorshipClass;
  }

  private async ensurePublicClass(slugOrId: string) {
    const mentorshipClass = await this.prisma.mentorshipClass.findFirst({
      where: { published: true, deletedAt: null, OR: [{ id: slugOrId }, { slug: slugOrId }] },
    });
    if (!mentorshipClass) {
      throw new NotFoundException('Mentorship class not found');
    }
    return mentorshipClass;
  }

  private async ensureSession(sessionId: string) {
    const session = await this.prisma.mentorshipSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  private async ensureEnrolled(mentorshipClassId: string, userId: string) {
    const participant = await this.prisma.mentorshipClassParticipant.findUnique({
      where: { mentorshipClassId_userId: { mentorshipClassId, userId } },
    });
    if (!participant || participant.status !== MentorshipParticipantStatus.ENROLLED) {
      throw new BadRequestException('You must be enrolled to perform this action');
    }
  }

  private findClassWithCounts(where: Prisma.MentorshipClassWhereInput) {
    return this.prisma.mentorshipClass.findFirst({
      where,
      include: this.classCountInclude(),
    });
  }

  private assertDateRange(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
      throw new BadRequestException('Mentorship dates are invalid');
    }
    if (endDate <= startDate) {
      throw new BadRequestException('Mentorship end date must be after start date');
    }
  }

  private assertEnrollmentWindow(mentorshipClass: {
    registrationDeadline: Date | null;
    startDate: Date;
  }) {
    const now = new Date();
    if (mentorshipClass.registrationDeadline && now > mentorshipClass.registrationDeadline) {
      throw new BadRequestException('Registration deadline has passed');
    }
    if (now > mentorshipClass.startDate) {
      throw new BadRequestException('Mentorship class has already started');
    }
  }

  private toCreateInput(
    dto: CreateMentorshipDto,
    slug: string,
    createdById?: string,
  ): Prisma.MentorshipClassCreateInput {
    return {
      title: dto.title,
      slug,
      description: dto.description,
      category: dto.category?.trim().toUpperCase() ?? 'GENERAL',
      bannerImageUrl: dto.bannerImageUrl,
      mentorName: dto.mentorName,
      mentorBio: dto.mentorBio,
      mentorImageUrl: dto.mentorImageUrl,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      registrationDeadline: dto.registrationDeadline
        ? new Date(dto.registrationDeadline)
        : undefined,
      capacity: dto.capacity,
      featured: dto.featured ?? false,
      published: dto.published ?? false,
      ...(createdById ? { createdBy: { connect: { id: createdById } } } : {}),
    };
  }

  private toUpdateInput(dto: UpdateMentorshipDto, slug?: string): Prisma.MentorshipClassUpdateInput {
    return {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.category !== undefined ? { category: dto.category.trim().toUpperCase() } : {}),
      ...(dto.bannerImageUrl !== undefined ? { bannerImageUrl: dto.bannerImageUrl } : {}),
      ...(dto.mentorName !== undefined ? { mentorName: dto.mentorName } : {}),
      ...(dto.mentorBio !== undefined ? { mentorBio: dto.mentorBio } : {}),
      ...(dto.mentorImageUrl !== undefined ? { mentorImageUrl: dto.mentorImageUrl } : {}),
      ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
      ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
      ...(dto.registrationDeadline !== undefined
        ? {
            registrationDeadline: dto.registrationDeadline
              ? new Date(dto.registrationDeadline)
              : null,
          }
        : {}),
      ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
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
      await this.prisma.mentorshipClass.findFirst({
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
    return slug || `mentorship-${Date.now()}`;
  }

  private toResponse(mentorshipClass: ClassWithCounts | null) {
    if (!mentorshipClass) {
      throw new NotFoundException('Mentorship class not found');
    }
    return {
      id: mentorshipClass.id,
      title: mentorshipClass.title,
      slug: mentorshipClass.slug,
      description: mentorshipClass.description,
      category: mentorshipClass.category,
      bannerImageUrl: mentorshipClass.bannerImageUrl,
      mentorName: mentorshipClass.mentorName,
      mentorBio: mentorshipClass.mentorBio,
      mentorImageUrl: mentorshipClass.mentorImageUrl,
      mentor: this.toMentorProfile(mentorshipClass),
      startDate: mentorshipClass.startDate,
      endDate: mentorshipClass.endDate,
      registrationDeadline: mentorshipClass.registrationDeadline,
      capacity: mentorshipClass.capacity,
      enrolledCount: mentorshipClass.enrolledCount,
      waitlistCount: mentorshipClass.waitlistCount,
      sessionCount: mentorshipClass._count.sessions,
      feedbackCount: mentorshipClass._count.feedback,
      featured: mentorshipClass.featured,
      published: mentorshipClass.published,
      createdAt: mentorshipClass.createdAt,
      updatedAt: mentorshipClass.updatedAt,
    };
  }

  private toMentorProfile(mentorshipClass: {
    mentorName: string | null;
    mentorBio: string | null;
    mentorImageUrl: string | null;
    category?: string;
  }) {
    return {
      name: mentorshipClass.mentorName,
      bio: mentorshipClass.mentorBio,
      imageUrl: mentorshipClass.mentorImageUrl,
      category: mentorshipClass.category ?? null,
    };
  }

  private toSessionResponse(session: {
    id: string;
    mentorshipClassId: string;
    title: string;
    description: string | null;
    scheduledAt: Date;
    durationMinutes: number;
    meetingLink: string | null;
    location: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: session.id,
      mentorshipClassId: session.mentorshipClassId,
      title: session.title,
      description: session.description,
      scheduledAt: session.scheduledAt,
      durationMinutes: session.durationMinutes,
      meetingLink: session.meetingLink,
      location: session.location,
      sortOrder: session.sortOrder,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private toParticipantResponse(participant: {
    id: string;
    status: MentorshipParticipantStatus;
    joinedAt: Date;
    waitlistedAt: Date | null;
    cancelledAt: Date | null;
    user?: { id: string; fullName: string; email: string; role: string };
  }) {
    return {
      id: participant.id,
      status: participant.status,
      joinedAt: participant.joinedAt,
      waitlistedAt: participant.waitlistedAt,
      cancelledAt: participant.cancelledAt,
      ...(participant.user ? { user: participant.user } : {}),
    };
  }

  private toAttendanceResponse(item: {
    id: string;
    sessionId: string;
    userId: string;
    status: MentorshipAttendanceStatus;
    notes: string | null;
    markedAt: Date;
    user?: { id: string; fullName: string; email: string; role: string };
  }) {
    return {
      id: item.id,
      sessionId: item.sessionId,
      userId: item.userId,
      status: item.status,
      notes: item.notes,
      markedAt: item.markedAt,
      ...(item.user ? { user: item.user } : {}),
    };
  }

  private toFeedbackResponse(item: {
    id: string;
    mentorshipClassId: string;
    userId: string;
    rating: number;
    comment: string | null;
    submittedAt: Date;
    user?: { id: string; fullName: string; email: string; role: string };
  }) {
    return {
      id: item.id,
      mentorshipClassId: item.mentorshipClassId,
      userId: item.userId,
      rating: item.rating,
      comment: item.comment,
      submittedAt: item.submittedAt,
      ...(item.user ? { user: item.user } : {}),
    };
  }

  private toProgressResponse(item: {
    id?: string;
    mentorshipClassId: string;
    userId?: string;
    completionPct: number;
    currentMilestone: string | null;
    notes: string | null;
    lastUpdatedAt: Date | null;
    user?: { id: string; fullName: string; email: string; role: string };
  }) {
    return {
      ...(item.id ? { id: item.id } : {}),
      mentorshipClassId: item.mentorshipClassId,
      ...(item.userId ? { userId: item.userId } : {}),
      completionPct: item.completionPct,
      currentMilestone: item.currentMilestone,
      notes: item.notes,
      lastUpdatedAt: item.lastUpdatedAt,
      ...(item.user ? { user: item.user } : {}),
    };
  }
}
