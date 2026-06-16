import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClipQueryDto } from './dto/clip-query.dto';
import { CreateClipDto } from './dto/create-clip.dto';
import { UpdateClipDto } from './dto/update-clip.dto';

@Injectable()
export class ClipsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(query: ClipQueryDto) {
    return this.listClips(query, { status: ContentStatus.PUBLISHED });
  }

  async listAdmin(query: ClipQueryDto) {
    return this.listClips(query, {});
  }

  async listFeatured(query: ClipQueryDto) {
    return this.listClips({ ...query, featured: true }, { status: ContentStatus.PUBLISHED });
  }

  async findPublicById(id: string) {
    const existing = await this.prisma.clip.findFirst({
      where: { id, deletedAt: null, status: ContentStatus.PUBLISHED },
    });

    if (!existing) {
      throw new NotFoundException('Clip not found');
    }

    const clip = await this.prisma.clip.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return { data: this.toResponse(clip) };
  }

  async findAdminById(id: string) {
    const clip = await this.prisma.clip.findFirst({
      where: { id, deletedAt: null },
    });

    if (!clip) {
      throw new NotFoundException('Clip not found');
    }

    return { data: this.toResponse(clip) };
  }

  async create(dto: CreateClipDto) {
    const created = await this.prisma.clip.create({
      data: this.toCreateInput(dto),
    });

    return { data: this.toResponse(created) };
  }

  async update(id: string, dto: UpdateClipDto) {
    await this.ensureClip(id);
    const updated = await this.prisma.clip.update({
      where: { id },
      data: this.toUpdateInput(dto),
    });

    return { data: this.toResponse(updated) };
  }

  async publish(id: string) {
    await this.ensureClip(id);
    const updated = await this.prisma.clip.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    return { data: this.toResponse(updated) };
  }

  async unpublish(id: string) {
    await this.ensureClip(id);
    const updated = await this.prisma.clip.update({
      where: { id },
      data: {
        status: ContentStatus.DRAFT,
        publishedAt: null,
      },
    });

    return { data: this.toResponse(updated) };
  }

  async remove(id: string) {
    await this.ensureClip(id);
    await this.prisma.clip.update({
      where: { id },
      data: { deletedAt: new Date(), status: ContentStatus.ARCHIVED },
    });

    return { success: true };
  }

  private async listClips(query: ClipQueryDto, fixedWhere: Prisma.ClipWhereInput) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.ClipWhereInput = {
      deletedAt: null,
      ...fixedWhere,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { speaker: { contains: query.search, mode: 'insensitive' } },
              { tags: { has: query.search } },
              { scriptureReferences: { has: query.search } },
            ],
          }
        : {}),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(typeof query.featured === 'boolean' ? { featured: query.featured } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.clip.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.clip.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      total,
      limit,
      offset,
    };
  }

  private async ensureClip(id: string) {
    const clip = await this.prisma.clip.findFirst({ where: { id, deletedAt: null } });
    if (!clip) {
      throw new NotFoundException('Clip not found');
    }
    return clip;
  }

  private toCreateInput(dto: CreateClipDto): Prisma.ClipCreateInput {
    const status = dto.isPublished ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
    return {
      title: dto.title,
      description: dto.description,
      mediaUrl: dto.videoUrl,
      thumbnailUrl: dto.thumbnailUrl,
      category: dto.category?.trim().toUpperCase() ?? 'GENERAL',
      durationSeconds: dto.durationSeconds,
      speaker: dto.speaker,
      scriptureReferences: this.cleanList(dto.scriptureReferences),
      tags: this.cleanList(dto.tags).map((tag) => tag.toLowerCase()),
      featured: dto.featured ?? false,
      status,
      publishedAt: status === ContentStatus.PUBLISHED ? new Date() : null,
    };
  }

  private toUpdateInput(dto: UpdateClipDto): Prisma.ClipUpdateInput {
    const publishState =
      typeof dto.isPublished === 'boolean'
        ? {
            status: dto.isPublished ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
            publishedAt: dto.isPublished ? new Date() : null,
          }
        : {};

    return {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.videoUrl !== undefined ? { mediaUrl: dto.videoUrl } : {}),
      ...(dto.thumbnailUrl !== undefined ? { thumbnailUrl: dto.thumbnailUrl } : {}),
      ...(dto.category !== undefined ? { category: dto.category.trim().toUpperCase() } : {}),
      ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
      ...(dto.speaker !== undefined ? { speaker: dto.speaker } : {}),
      ...(dto.scriptureReferences !== undefined
        ? { scriptureReferences: { set: this.cleanList(dto.scriptureReferences) } }
        : {}),
      ...(dto.tags !== undefined
        ? { tags: { set: this.cleanList(dto.tags).map((tag) => tag.toLowerCase()) } }
        : {}),
      ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
      ...publishState,
    };
  }

  private toResponse(clip: {
    id: string;
    title: string;
    description: string | null;
    mediaUrl: string;
    thumbnailUrl: string | null;
    category: string;
    durationSeconds: number | null;
    speaker: string | null;
    scriptureReferences: string[];
    tags: string[];
    viewCount: number;
    featured: boolean;
    status: ContentStatus;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: clip.id,
      title: clip.title,
      description: clip.description,
      videoUrl: clip.mediaUrl,
      thumbnailUrl: clip.thumbnailUrl,
      category: clip.category,
      durationSeconds: clip.durationSeconds,
      speaker: clip.speaker,
      scriptureReferences: clip.scriptureReferences,
      tags: clip.tags,
      viewCount: clip.viewCount,
      featured: clip.featured,
      status: clip.status,
      isPublished: clip.status === ContentStatus.PUBLISHED,
      publishedAt: clip.publishedAt,
      createdAt: clip.createdAt,
      updatedAt: clip.updatedAt,
    };
  }

  private cleanList(values: string[] | undefined) {
    return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  }
}
