import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProgramEnrollmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { ProgramQueryDto } from './dto/program-query.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { UpdateProgramProgressDto } from './dto/update-program-progress.dto';

type ProgramWithCounts = Prisma.EmpowermentProgramGetPayload<{
  include: { _count: { select: { enrollments: true } } };
}>;

type ProgramWithEnrollments = Prisma.EmpowermentProgramGetPayload<{
  include: {
    _count: { select: { enrollments: true } };
    enrollments: {
      include: {
        user: { select: { id: true; fullName: true; email: true; role: true } };
      };
    };
  };
}>;

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(query: ProgramQueryDto) {
    return this.listPrograms(query, { published: true, deletedAt: null });
  }

  async listFeatured(query: ProgramQueryDto) {
    return this.listPrograms({ ...query, featured: true }, { published: true, deletedAt: null });
  }

  async listAdmin(query: ProgramQueryDto) {
    return this.listPrograms(query, { deletedAt: null });
  }

  async findPublicBySlugOrId(slugOrId: string) {
    const program = await this.findProgramWithCounts({
      published: true,
      deletedAt: null,
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return { data: this.toResponse(program) };
  }

  async findAdminById(id: string) {
    const program = await this.findProgramWithCounts({ id, deletedAt: null });
    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return { data: this.toResponse(program) };
  }

  async listEnrollments(id: string) {
    const program = await this.prisma.empowermentProgram.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            enrollments: { where: { status: ProgramEnrollmentStatus.ENROLLED } },
          },
        },
        enrollments: {
          orderBy: [{ enrolledAt: 'desc' }],
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true } },
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return {
      data: this.toResponse(program),
      enrollments: program.enrollments.map((enrollment) => ({
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        cancelledAt: enrollment.cancelledAt,
        user: enrollment.user,
      })),
    };
  }

  async listProgramProgress(id: string) {
    const program = await this.ensureProgram(id);
    const progressRecords = await this.prisma.programProgress.findMany({
      where: { programId: program.id },
      orderBy: [{ lastUpdatedAt: 'desc' }],
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });

    return {
      data: this.toResponse(await this.findProgramWithCounts({ id: program.id, deletedAt: null })),
      progress: progressRecords.map((record) => this.toProgressResponse(record)),
    };
  }

  async adminAnalytics() {
    const [totalPrograms, publishedPrograms, featuredPrograms, activeEnrollments, avgCompletion] =
      await this.prisma.$transaction([
        this.prisma.empowermentProgram.count({ where: { deletedAt: null } }),
        this.prisma.empowermentProgram.count({ where: { deletedAt: null, published: true } }),
        this.prisma.empowermentProgram.count({ where: { deletedAt: null, featured: true } }),
        this.prisma.programEnrollment.count({ where: { status: ProgramEnrollmentStatus.ENROLLED } }),
        this.prisma.programProgress.aggregate({ _avg: { completionPct: true } }),
      ]);

    return {
      data: {
        totalPrograms,
        publishedPrograms,
        featuredPrograms,
        activeEnrollments,
        averageCompletionPct: avgCompletion._avg.completionPct ?? 0,
      },
    };
  }

  async create(dto: CreateProgramDto, createdById?: string) {
    this.assertDateRange(dto.startDate, dto.endDate);
    if (dto.registrationDeadline) {
      this.assertRegistrationDeadline(dto.registrationDeadline, dto.startDate);
    }

    const slug = await this.resolveUniqueSlug({
      preferredSlug: dto.slug,
      title: dto.title,
    });

    const created = await this.prisma.empowermentProgram.create({
      data: this.toCreateInput(dto, slug, createdById),
      include: {
        _count: {
          select: {
            enrollments: { where: { status: ProgramEnrollmentStatus.ENROLLED } },
          },
        },
      },
    });

    return { data: this.toResponse(created) };
  }

  async update(id: string, dto: UpdateProgramDto) {
    const existing = await this.ensureProgram(id);
    const startDate = dto.startDate ?? existing.startDate.toISOString();
    const endDate = dto.endDate ?? existing.endDate.toISOString();
    this.assertDateRange(startDate, endDate);

    const registrationDeadline =
      dto.registrationDeadline ?? existing.registrationDeadline?.toISOString();
    if (registrationDeadline) {
      this.assertRegistrationDeadline(registrationDeadline, startDate);
    }

    const slug =
      dto.slug !== undefined || dto.title !== undefined
        ? await this.resolveUniqueSlug({
            preferredSlug: dto.slug,
            title: dto.title ?? existing.title,
            ignoreId: id,
          })
        : undefined;

    const updated = await this.prisma.empowermentProgram.update({
      where: { id },
      data: this.toUpdateInput(dto, slug),
      include: {
        _count: {
          select: {
            enrollments: { where: { status: ProgramEnrollmentStatus.ENROLLED } },
          },
        },
      },
    });

    return { data: this.toResponse(updated) };
  }

  async publish(id: string) {
    await this.ensureProgram(id);
    const updated = await this.prisma.empowermentProgram.update({
      where: { id },
      data: { published: true },
      include: {
        _count: {
          select: {
            enrollments: { where: { status: ProgramEnrollmentStatus.ENROLLED } },
          },
        },
      },
    });

    return { data: this.toResponse(updated) };
  }

  async unpublish(id: string) {
    await this.ensureProgram(id);
    const updated = await this.prisma.empowermentProgram.update({
      where: { id },
      data: { published: false },
      include: {
        _count: {
          select: {
            enrollments: { where: { status: ProgramEnrollmentStatus.ENROLLED } },
          },
        },
      },
    });

    return { data: this.toResponse(updated) };
  }

  async remove(id: string) {
    await this.ensureProgram(id);
    await this.prisma.empowermentProgram.update({
      where: { id },
      data: { deletedAt: new Date(), published: false },
    });
    return { success: true };
  }

  async enroll(slugOrId: string, userId: string) {
    const program = await this.ensurePublicProgram(slugOrId);
    this.assertEnrollmentWindow(program);

    if (program.capacity !== null && program.enrolledCount >= program.capacity) {
      throw new ConflictException('Program capacity has been reached');
    }

    const existing = await this.prisma.programEnrollment.findUnique({
      where: { programId_userId: { programId: program.id, userId } },
    });

    if (existing?.status === ProgramEnrollmentStatus.ENROLLED) {
      throw new ConflictException('Already enrolled in this program');
    }

    const enrollment = await this.prisma.$transaction(async (tx) => {
      const record = await tx.programEnrollment.upsert({
        where: { programId_userId: { programId: program.id, userId } },
        update: {
          status: ProgramEnrollmentStatus.ENROLLED,
          enrolledAt: new Date(),
          cancelledAt: null,
        },
        create: {
          programId: program.id,
          userId,
          status: ProgramEnrollmentStatus.ENROLLED,
        },
        include: {
          program: {
            include: {
              _count: {
                select: {
                  enrollments: { where: { status: ProgramEnrollmentStatus.ENROLLED } },
                },
              },
            },
          },
        },
      });

      if (existing?.status !== ProgramEnrollmentStatus.ENROLLED) {
        await tx.empowermentProgram.update({
          where: { id: program.id },
          data: { enrolledCount: { increment: 1 } },
        });
      }

      await tx.programProgress.upsert({
        where: { programId_userId: { programId: program.id, userId } },
        update: { lastUpdatedAt: new Date() },
        create: { programId: program.id, userId },
      });

      return record;
    });

    return {
      data: {
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        cancelledAt: enrollment.cancelledAt,
        program: this.toResponse(enrollment.program),
      },
    };
  }

  async cancelEnrollment(slugOrId: string, userId: string) {
    const program = await this.ensurePublicProgram(slugOrId);
    const enrollment = await this.prisma.programEnrollment.findUnique({
      where: { programId_userId: { programId: program.id, userId } },
    });

    if (!enrollment || enrollment.status === ProgramEnrollmentStatus.CANCELLED) {
      return { success: true };
    }

    await this.prisma.$transaction([
      this.prisma.programEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: ProgramEnrollmentStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      }),
      this.prisma.empowermentProgram.update({
        where: { id: program.id },
        data: { enrolledCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  }

  async listMyEnrollments(userId: string) {
    const enrollments = await this.prisma.programEnrollment.findMany({
      where: { userId, status: ProgramEnrollmentStatus.ENROLLED },
      orderBy: [{ enrolledAt: 'desc' }],
      include: {
        program: {
          include: {
            _count: {
              select: {
                enrollments: { where: { status: ProgramEnrollmentStatus.ENROLLED } },
              },
            },
          },
        },
      },
    });

    return {
      data: enrollments.map((enrollment) => ({
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        program: this.toResponse(enrollment.program),
      })),
    };
  }

  async getMyProgress(slugOrId: string, userId: string) {
    const program = await this.ensurePublicProgram(slugOrId);
    const progress = await this.prisma.programProgress.findUnique({
      where: { programId_userId: { programId: program.id, userId } },
    });

    if (!progress) {
      return {
        data: {
          programId: program.id,
          completionPct: 0,
          currentModule: null,
          notes: null,
          lastUpdatedAt: null,
        },
      };
    }

    return { data: this.toProgressResponse(progress) };
  }

  async updateMyProgress(slugOrId: string, userId: string, dto: UpdateProgramProgressDto) {
    const program = await this.ensurePublicProgram(slugOrId);
    const enrollment = await this.prisma.programEnrollment.findUnique({
      where: { programId_userId: { programId: program.id, userId } },
    });

    if (!enrollment || enrollment.status !== ProgramEnrollmentStatus.ENROLLED) {
      throw new BadRequestException('Enroll in the program before tracking progress');
    }

    const progress = await this.prisma.programProgress.upsert({
      where: { programId_userId: { programId: program.id, userId } },
      update: {
        ...(dto.completionPct !== undefined ? { completionPct: dto.completionPct } : {}),
        ...(dto.currentModule !== undefined ? { currentModule: dto.currentModule } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        lastUpdatedAt: new Date(),
      },
      create: {
        programId: program.id,
        userId,
        completionPct: dto.completionPct ?? 0,
        currentModule: dto.currentModule,
        notes: dto.notes,
      },
    });

    return { data: this.toProgressResponse(progress) };
  }

  private async listPrograms(query: ProgramQueryDto, fixedWhere: Prisma.EmpowermentProgramWhereInput) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.EmpowermentProgramWhereInput = {
      ...fixedWhere,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { instructorName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(typeof query.featured === 'boolean' ? { featured: query.featured } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.empowermentProgram.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { startDate: 'asc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          _count: {
            select: {
              enrollments: { where: { status: ProgramEnrollmentStatus.ENROLLED } },
            },
          },
        },
      }),
      this.prisma.empowermentProgram.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      total,
      limit,
      offset,
    };
  }

  private async ensureProgram(id: string) {
    const program = await this.prisma.empowermentProgram.findFirst({
      where: { id, deletedAt: null },
    });
    if (!program) {
      throw new NotFoundException('Program not found');
    }
    return program;
  }

  private async ensurePublicProgram(slugOrId: string) {
    const program = await this.prisma.empowermentProgram.findFirst({
      where: { published: true, deletedAt: null, OR: [{ id: slugOrId }, { slug: slugOrId }] },
    });
    if (!program) {
      throw new NotFoundException('Program not found');
    }
    return program;
  }

  private findProgramWithCounts(where: Prisma.EmpowermentProgramWhereInput) {
    return this.prisma.empowermentProgram.findFirst({
      where,
      include: {
        _count: {
          select: {
            enrollments: { where: { status: ProgramEnrollmentStatus.ENROLLED } },
          },
        },
      },
    });
  }

  private assertDateRange(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
      throw new BadRequestException('Program dates are invalid');
    }
    if (endDate <= startDate) {
      throw new BadRequestException('Program end date must be after start date');
    }
  }

  private assertRegistrationDeadline(deadline: string, startDate: string) {
    const deadlineDate = new Date(deadline);
    const start = new Date(startDate);
    if (Number.isNaN(deadlineDate.valueOf())) {
      throw new BadRequestException('Registration deadline is invalid');
    }
    if (deadlineDate > start) {
      throw new BadRequestException('Registration deadline must be on or before program start');
    }
  }

  private assertEnrollmentWindow(program: {
    registrationDeadline: Date | null;
    startDate: Date;
  }) {
    const now = new Date();
    if (program.registrationDeadline && now > program.registrationDeadline) {
      throw new BadRequestException('Registration deadline has passed');
    }
    if (now > program.startDate) {
      throw new BadRequestException('Program has already started');
    }
  }

  private toCreateInput(
    dto: CreateProgramDto,
    slug: string,
    createdById?: string,
  ): Prisma.EmpowermentProgramCreateInput {
    return {
      title: dto.title,
      slug,
      description: dto.description,
      category: dto.category?.trim().toUpperCase() ?? 'GENERAL',
      bannerImageUrl: dto.bannerImageUrl,
      instructorName: dto.instructorName,
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

  private toUpdateInput(dto: UpdateProgramDto, slug?: string): Prisma.EmpowermentProgramUpdateInput {
    return {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.category !== undefined ? { category: dto.category.trim().toUpperCase() } : {}),
      ...(dto.bannerImageUrl !== undefined ? { bannerImageUrl: dto.bannerImageUrl } : {}),
      ...(dto.instructorName !== undefined ? { instructorName: dto.instructorName } : {}),
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
      await this.prisma.empowermentProgram.findFirst({
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

    return slug || `program-${Date.now()}`;
  }

  private toResponse(program: ProgramWithCounts | ProgramWithEnrollments | null) {
    if (!program) {
      throw new NotFoundException('Program not found');
    }

    const enrolledCount =
      'enrollments' in program
        ? program.enrollments.filter(
            (enrollment) => enrollment.status === ProgramEnrollmentStatus.ENROLLED,
          ).length
        : program._count.enrollments;

    return {
      id: program.id,
      title: program.title,
      slug: program.slug,
      description: program.description,
      category: program.category,
      bannerImageUrl: program.bannerImageUrl,
      instructorName: program.instructorName,
      startDate: program.startDate,
      endDate: program.endDate,
      registrationDeadline: program.registrationDeadline,
      capacity: program.capacity,
      enrolledCount,
      featured: program.featured,
      published: program.published,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    };
  }

  private toProgressResponse(progress: {
    id: string;
    programId: string;
    userId: string;
    completionPct: number;
    currentModule: string | null;
    notes: string | null;
    lastUpdatedAt: Date;
    user?: { id: string; fullName: string; email: string; role: string };
  }) {
    return {
      id: progress.id,
      programId: progress.programId,
      userId: progress.userId,
      completionPct: progress.completionPct,
      currentModule: progress.currentModule,
      notes: progress.notes,
      lastUpdatedAt: progress.lastUpdatedAt,
      ...(progress.user
        ? {
            user: {
              id: progress.user.id,
              fullName: progress.user.fullName,
              email: progress.user.email,
              role: progress.user.role,
            },
          }
        : {}),
    };
  }
}
