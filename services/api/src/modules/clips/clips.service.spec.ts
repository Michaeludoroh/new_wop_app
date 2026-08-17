import { NotFoundException } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { ClipsService } from './clips.service';

const clip = {
  id: 'clip-1',
  title: 'Faith for Today',
  description: 'A short teaching clip.',
  mediaUrl: 'https://cdn.example.com/clips/faith.mp4',
  thumbnailUrl: 'https://cdn.example.com/clips/faith.jpg',
  category: 'TEACHING',
  durationSeconds: 180,
  speaker: 'Pastor Ada',
  scriptureReferences: ['Hebrews 11:1'],
  tags: ['faith', 'teaching'],
  viewCount: 12,
  featured: true,
  status: ContentStatus.PUBLISHED,
  publishedAt: new Date('2026-06-10T10:00:00.000Z'),
  createdAt: new Date('2026-06-09T10:00:00.000Z'),
  updatedAt: new Date('2026-06-10T10:00:00.000Z'),
  deletedAt: null,
};

function createService() {
  const prisma = {
    $transaction: jest.fn().mockImplementation((operations) => Promise.all(operations)),
    clip: {
      findMany: jest.fn().mockResolvedValue([clip]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue(clip),
      create: jest.fn().mockResolvedValue(clip),
      update: jest.fn().mockResolvedValue(clip),
    },
  };

  return {
    service: new ClipsService(prisma as never),
    prisma,
  };
}

describe('ClipsService', () => {
  it('lists only published public clips with search, category, featured, and pagination filters', async () => {
    const { service, prisma } = createService();

    await expect(
      service.listPublic({
        search: 'faith',
        category: 'TEACHING',
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
          id: 'clip-1',
          videoUrl: clip.mediaUrl,
          isPublished: true,
        }),
      ],
    });

    expect(prisma.clip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ContentStatus.PUBLISHED,
          deletedAt: null,
          featured: true,
        }),
        skip: 5,
        take: 10,
      }),
    );
  });

  it('rewrites localhost media URLs to the public API origin', async () => {
    const previous = process.env.API_PUBLIC_URL;
    process.env.API_PUBLIC_URL = 'https://woppandmopp.com';
    const { service, prisma } = createService();
    prisma.clip.findMany.mockResolvedValueOnce([
      {
        ...clip,
        mediaUrl: 'http://localhost:4000/api/v1/uploads/clips/media/faith.mp4',
      },
    ]);

    try {
      await expect(service.listPublic({})).resolves.toMatchObject({
        data: [
          expect.objectContaining({
            videoUrl: 'https://woppandmopp.com/api/v1/uploads/clips/media/faith.mp4',
          }),
        ],
      });
    } finally {
      if (previous === undefined) {
        delete process.env.API_PUBLIC_URL;
      } else {
        process.env.API_PUBLIC_URL = previous;
      }
    }
  });

  it('creates published clips with canonical metadata and video URL mapped to mediaUrl', async () => {
    const { service, prisma } = createService();

    await service.create({
      title: 'Faith for Today',
      description: 'A short teaching clip.',
      videoUrl: clip.mediaUrl,
      category: 'teaching',
      speaker: 'Pastor Ada',
      scriptureReferences: ['Hebrews 11:1', 'Hebrews 11:1'],
      tags: ['Faith', 'teaching'],
      featured: true,
      isPublished: true,
    });

    expect(prisma.clip.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mediaUrl: clip.mediaUrl,
        category: 'TEACHING',
        scriptureReferences: ['Hebrews 11:1'],
        tags: ['faith', 'teaching'],
        status: ContentStatus.PUBLISHED,
        featured: true,
      }),
    });
  });

  it('increments view count for published public detail reads', async () => {
    const { service, prisma } = createService();

    await expect(service.findPublicById('clip-1')).resolves.toMatchObject({
      data: expect.objectContaining({ id: 'clip-1' }),
    });

    expect(prisma.clip.update).toHaveBeenCalledWith({
      where: { id: 'clip-1' },
      data: { viewCount: { increment: 1 } },
    });
  });

  it('does not expose unpublished public clips', async () => {
    const { service, prisma } = createService();
    prisma.clip.findFirst.mockResolvedValueOnce(null);

    await expect(service.findPublicById('clip-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.clip.update).not.toHaveBeenCalled();
  });

  it('soft deletes clips instead of removing rows', async () => {
    const { service, prisma } = createService();

    await expect(service.remove('clip-1')).resolves.toEqual({ success: true });
    expect(prisma.clip.update).toHaveBeenCalledWith({
      where: { id: 'clip-1' },
      data: expect.objectContaining({
        status: ContentStatus.ARCHIVED,
        deletedAt: expect.any(Date),
      }),
    });
  });
});
