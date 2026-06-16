import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnnouncementCategory,
  ContentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ANNOUNCEMENT_CATEGORIES } from './dto/announcement-category.constants';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

type RequestUser = {
  sub: string;
  role: Role;
};

type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  category: AnnouncementCategory;
  status: ContentStatus;
  isPublished: boolean;
  pushNotificationSent: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  adminUserId: string;
  adminUser?: { id: string; fullName: string; email: string } | null;
};

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listCategories() {
    return {
      data: ANNOUNCEMENT_CATEGORIES.map((value) => ({
        value,
        label: this.formatCategoryLabel(value),
      })),
    };
  }

  private formatCategoryLabel(category: AnnouncementCategory | string) {
    return String(category)
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }

  private toResponse(item: AnnouncementRecord) {
    const isPublished = item.status === ContentStatus.PUBLISHED;

    return {
      id: item.id,
      title: item.title,
      content: item.body,
      category: item.category,
      imageUrl: item.imageUrl,
      status: item.status,
      isPublished,
      pushNotificationSent: item.pushNotificationSent,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      publishedBy: item.adminUser
        ? {
            id: item.adminUser.id,
            name: item.adminUser.fullName,
            email: item.adminUser.email,
          }
        : { id: item.adminUserId },
    };
  }

  private buildListWhere(query: AnnouncementQueryDto, publishedOnly: boolean) {
    const category = this.resolveCategory(query.category);

    return {
      deletedAt: null as null,
      ...(publishedOnly
        ? { status: ContentStatus.PUBLISHED }
        : query.status
          ? { status: query.status }
          : {}),
      ...(category ? { category } : {}),
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                body: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };
  }

  private resolveCategory(value?: string): AnnouncementCategory | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    if (
      !ANNOUNCEMENT_CATEGORIES.includes(
        normalized as (typeof ANNOUNCEMENT_CATEGORIES)[number],
      )
    ) {
      throw new BadRequestException('Invalid announcement category filter');
    }
    return normalized as AnnouncementCategory;
  }

  private buildCreateData(user: RequestUser, dto: CreateAnnouncementDto) {
    const shouldPublish = dto.isPublished === true;

    return {
      title: dto.title,
      body: dto.content,
      imageUrl: dto.imageUrl ?? null,
      category: dto.category ?? AnnouncementCategory.GENERAL_UPDATE,
      status: shouldPublish ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
      isPublished: shouldPublish,
      publishedAt: shouldPublish ? new Date() : null,
      adminUserId: user.sub,
    };
  }

  private buildUpdateData(
    existing: AnnouncementRecord,
    dto: UpdateAnnouncementDto,
  ): Prisma.AnnouncementUpdateInput {
    const data: Prisma.AnnouncementUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.body = dto.content;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl || null;
    if (dto.category !== undefined) data.category = dto.category;

    if (dto.isPublished !== undefined) {
      data.status = dto.isPublished
        ? ContentStatus.PUBLISHED
        : ContentStatus.DRAFT;
      data.isPublished = dto.isPublished;
      data.publishedAt = dto.isPublished
        ? existing.publishedAt ?? new Date()
        : null;
    }

    return data;
  }

  async listPublic(query: AnnouncementQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(query, true);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.announcement.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip,
        include: {
          adminUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listAdmin(query: AnnouncementQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(query, false);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.announcement.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        take: limit,
        skip,
        include: {
          adminUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublicById(id: string) {
    const item = await this.prisma.announcement.findFirst({
      where: {
        id,
        deletedAt: null,
        status: ContentStatus.PUBLISHED,
      },
      include: {
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!item) throw new NotFoundException('Announcement not found');
    return this.toResponse(item);
  }

  async findAdminById(id: string) {
    const item = await this.prisma.announcement.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!item) throw new NotFoundException('Announcement not found');
    return this.toResponse(item);
  }

  async create(user: RequestUser, dto: CreateAnnouncementDto) {
    const created = await this.prisma.announcement.create({
      data: this.buildCreateData(user, dto),
      include: {
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'ANNOUNCEMENT_CREATED',
        resource: 'ANNOUNCEMENT',
        resourceId: created.id,
        metadata: {
          announcementId: created.id,
          title: created.title,
          category: created.category,
          isPublished: created.status === ContentStatus.PUBLISHED,
        } as Prisma.JsonObject,
      },
    });

    if (created.status === ContentStatus.PUBLISHED) {
      await this.notificationsService.deliverPublishedAnnouncement(created);
    }

    return this.toResponse(created);
  }

  async update(id: string, user: RequestUser, dto: UpdateAnnouncementDto) {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    const data = this.buildUpdateData(existing, dto);

    const updated = await this.prisma.announcement.update({
      where: { id },
      data,
      include: {
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'ANNOUNCEMENT_UPDATED',
        resource: 'ANNOUNCEMENT',
        resourceId: updated.id,
        metadata: {
          announcementId: updated.id,
          changedFields: Object.keys(dto),
        } as Prisma.JsonObject,
      },
    });

    if (
      existing.status !== ContentStatus.PUBLISHED &&
      updated.status === ContentStatus.PUBLISHED
    ) {
      await this.notificationsService.deliverPublishedAnnouncement(updated);
    }

    return this.toResponse(updated);
  }

  async publish(id: string, user: RequestUser) {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        isPublished: true,
        publishedAt: existing.publishedAt ?? new Date(),
      },
      include: {
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'ANNOUNCEMENT_PUBLISHED',
        resource: 'ANNOUNCEMENT',
        resourceId: updated.id,
        metadata: { announcementId: updated.id } as Prisma.JsonObject,
      },
    });

    await this.notificationsService.deliverPublishedAnnouncement(updated);

    return this.toResponse(updated);
  }

  async unpublish(id: string, user: RequestUser) {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        status: ContentStatus.DRAFT,
        isPublished: false,
        publishedAt: null,
      },
      include: {
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'ANNOUNCEMENT_UNPUBLISHED',
        resource: 'ANNOUNCEMENT',
        resourceId: updated.id,
        metadata: { announcementId: updated.id } as Prisma.JsonObject,
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string, user: RequestUser) {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    const deleted = await this.prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'ANNOUNCEMENT_DELETED',
        resource: 'ANNOUNCEMENT',
        resourceId: deleted.id,
        metadata: { announcementId: deleted.id } as Prisma.JsonObject,
      },
    });

    return { success: true };
  }
}
