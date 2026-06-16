import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProgramEnrollmentStatus } from '@prisma/client';
import { ProgramsService } from './programs.service';

const program = {
  id: 'program-1',
  title: 'Leadership Bootcamp',
  slug: 'leadership-bootcamp',
  description: 'A foundational leadership program.',
  category: 'LEADERSHIP',
  bannerImageUrl: 'https://cdn.example.com/programs/leadership.jpg',
  instructorName: 'Pastor Jane',
  startDate: new Date('2026-08-01T09:00:00.000Z'),
  endDate: new Date('2026-08-30T17:00:00.000Z'),
  registrationDeadline: new Date('2026-07-25T23:59:59.000Z'),
  capacity: 30,
  enrolledCount: 5,
  featured: true,
  published: true,
  createdAt: new Date('2026-06-10T10:00:00.000Z'),
  updatedAt: new Date('2026-06-10T10:00:00.000Z'),
  _count: { enrollments: 5 },
};

function createService() {
  const prisma = {
    $transaction: jest.fn().mockImplementation((operations) => {
      if (typeof operations === 'function') {
        return operations(prisma);
      }
      return Promise.all(operations);
    }),
    empowermentProgram: {
      findMany: jest.fn().mockResolvedValue([program]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(program),
      create: jest.fn().mockResolvedValue(program),
      update: jest.fn().mockResolvedValue(program),
    },
    programEnrollment: {
      count: jest.fn().mockResolvedValue(5),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({
        id: 'enrollment-1',
        status: ProgramEnrollmentStatus.ENROLLED,
        enrolledAt: new Date('2026-06-10T10:00:00.000Z'),
        cancelledAt: null,
        program,
      }),
      update: jest.fn().mockResolvedValue({ id: 'enrollment-1' }),
    },
    programProgress: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { completionPct: 42.5 } }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({
        id: 'progress-1',
        programId: 'program-1',
        userId: 'user-1',
        completionPct: 25,
        currentModule: 'Module 1',
        notes: null,
        lastUpdatedAt: new Date('2026-06-10T10:00:00.000Z'),
      }),
    },
  };

  return {
    service: new ProgramsService(prisma as never),
    prisma,
  };
}

describe('ProgramsService', () => {
  it('lists published public programs with search, category, featured, and pagination filters', async () => {
    const { service, prisma } = createService();

    await expect(
      service.listPublic({
        search: 'leadership',
        category: 'LEADERSHIP',
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
          id: 'program-1',
          slug: 'leadership-bootcamp',
          enrolledCount: 5,
          published: true,
        }),
      ],
    });

    expect(prisma.empowermentProgram.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          published: true,
          deletedAt: null,
          featured: true,
        }),
        skip: 5,
        take: 10,
      }),
    );
  });

  it('creates programs with generated slugs and validated date ranges', async () => {
    const { service, prisma } = createService();
    prisma.empowermentProgram.findFirst.mockResolvedValue(null);

    await service.create({
      title: 'New Program',
      startDate: '2026-09-01T09:00:00.000Z',
      endDate: '2026-09-30T17:00:00.000Z',
      category: 'faith',
    });

    expect(prisma.empowermentProgram.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'New Program',
          slug: 'new-program',
          category: 'FAITH',
        }),
      }),
    );
  });

  it('rejects invalid program date ranges', async () => {
    const { service } = createService();

    await expect(
      service.create({
        title: 'Invalid Dates',
        startDate: '2026-09-30T17:00:00.000Z',
        endDate: '2026-09-01T09:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes and unpublishes programs', async () => {
    const { service, prisma } = createService();
    prisma.empowermentProgram.findFirst.mockResolvedValue(program);

    await service.publish('program-1');
    expect(prisma.empowermentProgram.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { published: true } }),
    );

    await service.unpublish('program-1');
    expect(prisma.empowermentProgram.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { published: false } }),
    );
  });

  it('enrolls users when capacity allows', async () => {
    const { service, prisma } = createService();
    prisma.empowermentProgram.findFirst.mockResolvedValue(program);

    const result = await service.enroll('program-1', 'user-1');

    expect(result.data.status).toBe(ProgramEnrollmentStatus.ENROLLED);
    expect(prisma.programEnrollment.upsert).toHaveBeenCalled();
  });

  it('blocks enrollment when capacity is reached', async () => {
    const { service, prisma } = createService();
    prisma.empowermentProgram.findFirst.mockResolvedValue({
      ...program,
      capacity: 5,
      enrolledCount: 5,
    });

    await expect(service.enroll('program-1', 'user-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns admin analytics summary', async () => {
    const { service } = createService();

    await expect(service.adminAnalytics()).resolves.toMatchObject({
      data: expect.objectContaining({
        totalPrograms: 1,
        publishedPrograms: 1,
        featuredPrograms: 1,
        activeEnrollments: 5,
        averageCompletionPct: 42.5,
      }),
    });
  });
});
