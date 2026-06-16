import {

  BadRequestException,

  ForbiddenException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {

  ContentStatus,

  PaymentStatus,

  Prisma,

  SubscriptionStatus,

  TransactionType,

} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { ContentAccessService } from '../subscriptions/content-access.service';

import { NotificationsService } from '../notifications/notifications.service';

import { CreateEbookDto } from './dto/create-ebook.dto';

import { EbookQueryDto } from './dto/ebook-query.dto';

import { ReadingProgressDto } from './dto/reading-progress.dto';

import { UpdateEbookDto } from './dto/update-ebook.dto';

import { createReadStream, existsSync } from 'fs';

import { join } from 'path';

import { Response } from 'express';



type PurchasePayload = {

  ebookId: string;

  paymentReference?: string;

};



@Injectable()

export class EbooksService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly notificationsService: NotificationsService,

    private readonly contentAccessService: ContentAccessService,

    private readonly configService: ConfigService,

  ) {}



  async findAll(query: EbookQueryDto) {

    const where = this.buildPublicWhere(query);

    const orderBy: Prisma.EbookOrderByWithRelationInput[] = query.recent

      ? [{ createdAt: 'desc' }]

      : [{ title: 'asc' }];



    const ebooks = await this.prisma.ebook.findMany({

      where,

      orderBy,

      take: query.featured ? 10 : undefined,

    });



    const featured = await this.prisma.ebook.findMany({

      where: {

        ...where,

        isPremium: false,

      },

      orderBy: [{ createdAt: 'desc' }],

      take: 6,

    });



    const recent = await this.prisma.ebook.findMany({

      where,

      orderBy: [{ createdAt: 'desc' }],

      take: 6,

    });



    return {

      data: ebooks.map((item) => this.toPublicResponse(item)),

      featured: featured.map((item) => this.toPublicResponse(item)),

      recent: recent.map((item) => this.toPublicResponse(item)),

    };

  }



  async findOne(id: string) {

    const ebook = await this.findPublishedEbook(id);

    return { data: this.toPublicResponse(ebook) };

  }



  async listAdmin(query: EbookQueryDto) {

    const limit = query.limit ?? 20;

    const offset = query.offset ?? 0;

    const where: Prisma.EbookWhereInput = {

      deletedAt: null,

      ...(query.search

        ? {

            OR: [

              { title: { contains: query.search, mode: 'insensitive' } },

              { author: { contains: query.search, mode: 'insensitive' } },

              { description: { contains: query.search, mode: 'insensitive' } },

            ],

          }

        : {}),

      ...(query.category

        ? { category: { equals: query.category, mode: 'insensitive' } }

        : {}),

      ...(query.status ? { status: query.status as ContentStatus } : {}),

    };



    const [items, total] = await this.prisma.$transaction([

      this.prisma.ebook.findMany({

        where,

        orderBy: [{ updatedAt: 'desc' }],

        skip: offset,

        take: limit,

      }),

      this.prisma.ebook.count({ where }),

    ]);



    return {

      data: items.map((item) => this.toAdminResponse(item)),

      total,

      limit,

      offset,

    };

  }



  async findAdminById(id: string) {

    const ebook = await this.ensureActiveEbook(id);

    return { data: this.toAdminResponse(ebook) };

  }



  async create(dto: CreateEbookDto) {

    const status = dto.isPublished ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;

    const created = await this.prisma.ebook.create({

      data: {

        title: dto.title,

        author: dto.author,

        description: dto.description,

        category: dto.category?.trim().toUpperCase() ?? 'GENERAL',

        price: dto.price ?? 0,

        isPremium: dto.isPremium ?? (dto.price ?? 0) > 0,

        fileUrl: dto.fileUrl,

        coverUrl: dto.coverUrl,

        status,

        publishedAt: status === ContentStatus.PUBLISHED ? new Date() : null,

      },

    });



    return { data: this.toAdminResponse(created) };

  }



  async update(id: string, dto: UpdateEbookDto) {

    await this.ensureActiveEbook(id);

    const publishState =

      typeof dto.isPublished === 'boolean'

        ? {

            status: dto.isPublished ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,

            publishedAt: dto.isPublished ? new Date() : null,

          }

        : {};



    const updated = await this.prisma.ebook.update({

      where: { id },

      data: {

        ...(dto.title !== undefined ? { title: dto.title } : {}),

        ...(dto.author !== undefined ? { author: dto.author } : {}),

        ...(dto.description !== undefined ? { description: dto.description } : {}),

        ...(dto.category !== undefined

          ? { category: dto.category.trim().toUpperCase() }

          : {}),

        ...(dto.price !== undefined ? { price: dto.price } : {}),

        ...(dto.isPremium !== undefined ? { isPremium: dto.isPremium } : {}),

        ...(dto.fileUrl !== undefined ? { fileUrl: dto.fileUrl } : {}),

        ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl } : {}),

        ...publishState,

      },

    });



    return { data: this.toAdminResponse(updated) };

  }



  async publish(id: string) {

    await this.ensureActiveEbook(id);

    const updated = await this.prisma.ebook.update({

      where: { id },

      data: {

        status: ContentStatus.PUBLISHED,

        publishedAt: new Date(),

      },

    });



    return { data: this.toAdminResponse(updated) };

  }



  async unpublish(id: string) {

    await this.ensureActiveEbook(id);

    const updated = await this.prisma.ebook.update({

      where: { id },

      data: {

        status: ContentStatus.DRAFT,

        publishedAt: null,

      },

    });



    return { data: this.toAdminResponse(updated) };

  }



  async remove(id: string) {

    await this.ensureActiveEbook(id);

    await this.prisma.ebook.update({

      where: { id },

      data: {

        deletedAt: new Date(),

        status: ContentStatus.ARCHIVED,

      },

    });



    return { success: true };

  }



  async listCategories() {

    const rows = await this.prisma.ebook.findMany({

      where: { deletedAt: null, category: { not: null } },

      distinct: ['category'],

      select: { category: true },

      orderBy: [{ category: 'asc' }],

    });



    return {

      data: rows

        .map((row) => row.category)

        .filter((value): value is string => Boolean(value)),

    };

  }



  async getLibraryAnalytics() {

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);



    const [

      totalEbooks,

      publishedEbooks,

      draftEbooks,

      archivedEbooks,

      totalPurchases,

      purchaseRevenue,

      activeReaders,

      progressRecords,

      completedReads,

      downloadCount,

      topPurchased,

      topReading,

    ] = await Promise.all([

      this.prisma.ebook.count({ where: { deletedAt: null } }),

      this.prisma.ebook.count({

        where: { deletedAt: null, status: ContentStatus.PUBLISHED },

      }),

      this.prisma.ebook.count({

        where: { deletedAt: null, status: ContentStatus.DRAFT },

      }),

      this.prisma.ebook.count({ where: { deletedAt: { not: null } } }),

      this.prisma.ebookPurchase.count(),

      this.prisma.ebookPurchase.aggregate({ _sum: { amount: true } }),

      this.prisma.readingProgress.count({

        where: { lastReadAt: { gte: sevenDaysAgo } },

      }),

      this.prisma.readingProgress.count(),

      this.prisma.readingProgress.count({ where: { progressPct: { gte: 99 } } }),

      this.prisma.readingProgress.count({ where: { downloaded: true } }),

      this.prisma.ebookPurchase.groupBy({

        by: ['ebookId'],

        _count: { ebookId: true },

        orderBy: { _count: { ebookId: 'desc' } },

        take: 5,

      }),

      this.prisma.readingProgress.groupBy({

        by: ['ebookId'],

        _count: { ebookId: true },

        orderBy: { _count: { ebookId: 'desc' } },

        take: 5,

      }),

    ]);



    const ebookIds = [

      ...new Set([

        ...topPurchased.map((row) => row.ebookId),

        ...topReading.map((row) => row.ebookId),

      ]),

    ];



    const ebooks = ebookIds.length

      ? await this.prisma.ebook.findMany({

          where: { id: { in: ebookIds } },

          select: { id: true, title: true },

        })

      : [];



    const titleById = new Map(ebooks.map((ebook) => [ebook.id, ebook.title]));



    return {

      totals: {

        ebooks: totalEbooks,

        published: publishedEbooks,

        draft: draftEbooks,

        archived: archivedEbooks,

        purchases: totalPurchases,

        revenue: purchaseRevenue._sum.amount ?? 0,

        progressRecords,

        activeReadersLast7Days: activeReaders,

        completedReads,

        downloads: downloadCount,

      },

      topPurchased: topPurchased.map((row) => ({

        ebookId: row.ebookId,

        title: titleById.get(row.ebookId) ?? 'Unknown',

        count: row._count.ebookId,

      })),

      topReading: topReading.map((row) => ({

        ebookId: row.ebookId,

        title: titleById.get(row.ebookId) ?? 'Unknown',

        count: row._count.ebookId,

      })),

    };

  }



  async purchase(userId: string, payload: PurchasePayload) {

    if (!payload.paymentReference) {

      throw new BadRequestException({

        code: 'CHECKOUT_REQUIRED',

        message: 'eBook purchases must be completed through verified Flutterwave checkout',

      });

    }



    const ebook = await this.findPublishedEbook(payload.ebookId);



    const existing = await this.prisma.ebookPurchase.findUnique({

      where: { userId_ebookId: { userId, ebookId: ebook.id } },

    });



    if (existing) {

      return {

        message: 'eBook already purchased',

        data: existing,

      };

    }



    const transaction = await this.prisma.paymentTransaction.findUnique({

      where: { providerReference: payload.paymentReference },

    });



    if (

      !transaction ||

      transaction.userId !== userId ||

      transaction.status !== PaymentStatus.SUCCESS ||

      transaction.transactionType !== TransactionType.EBOOK_PURCHASE

    ) {

      throw new ForbiddenException(

        'A verified eBook payment is required before purchase entitlement is granted.',

      );

    }



    const metadata = this.asRecord(transaction.metadata);

    if (metadata.ebookId !== ebook.id) {

      throw new ForbiddenException('Verified payment does not match this eBook.');

    }



    const purchase = await this.prisma.ebookPurchase.upsert({

      where: { userId_ebookId: { userId, ebookId: ebook.id } },

      update: {

        paymentReference: transaction.providerReference,

        amount: transaction.amount,

      },

      create: {

        userId,

        ebookId: ebook.id,

        paymentReference: transaction.providerReference,

        amount: transaction.amount,

      },

    });



    await this.notificationsService.createTargeted(

      { sub: userId, role: 'USER', email: '' },

      {

        userId,

        title: 'Purchase confirmed',

        body: `Your purchase for "${ebook.title}" was successful.`,

        channel: 'IN_APP',

      },

    );



    return {

      message: 'Purchase successful',

      data: purchase,

    };

  }



  async access(userId: string, ebookId: string) {

    const ebook = await this.findPublishedEbook(ebookId);



    if (!ebook.isPremium) {

      const token = this.contentAccessService.issueAccessToken(userId, 'ebook', ebook.id);

      return this.buildAccessResponse(ebook.id, token, 'free_content');

    }



    const [purchase, activeSubscription] = await Promise.all([

      this.prisma.ebookPurchase.findUnique({

        where: { userId_ebookId: { userId, ebookId: ebook.id } },

      }),

      this.findPremiumSubscription(userId),

    ]);



    if (!purchase && !activeSubscription) {

      throw new ForbiddenException(

        'Subscribe or purchase this eBook to gain access.',

      );

    }



    const token = this.contentAccessService.issueAccessToken(userId, 'ebook', ebook.id);

    return this.buildAccessResponse(

      ebook.id,

      token,

      purchase ? 'purchased' : 'subscription',

    );

  }



  async streamFile(ebookId: string, token: string, res: Response) {

    if (!token?.trim()) {

      throw new ForbiddenException('Access token is required');

    }



    const validation = this.contentAccessService.validateResourceAccessToken(token, {

      resourceType: 'ebook',

      resourceId: ebookId,

    });



    if (!validation.valid) {

      throw new ForbiddenException('Invalid or expired access token');

    }



    const entitlement = await this.access(validation.userId, ebookId).catch(() => null);

    if (!entitlement?.authorized) {

      throw new ForbiddenException('You do not have access to this eBook');

    }



    const ebook = await this.findPublishedEbook(ebookId);

    const absolutePath = this.resolveAbsoluteFilePath(ebook.fileUrl);

    if (!existsSync(absolutePath)) {

      throw new NotFoundException('eBook file not found');

    }



    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader('Cache-Control', 'private, no-store');

    createReadStream(absolutePath).pipe(res);

  }



  private buildAccessResponse(

    ebookId: string,

    token: {

      accessToken: string;

      expiresInSeconds: number;

      expiresAt: string;

    },

    reason: string,

  ) {

    const baseUrl = (

      this.configService.get<string>('API_PUBLIC_URL') ?? 'http://localhost:4000'

    ).replace(/\/$/, '');

    const streamUrl = `${baseUrl}/api/v1/ebooks/${ebookId}/stream?token=${encodeURIComponent(token.accessToken)}`;



    return {

      authorized: true,

      reason,

      streamUrl,

      streamToken: token.accessToken,

      accessToken: token.accessToken,

      expiresInSeconds: token.expiresInSeconds,

      expiresAt: token.expiresAt,

    };

  }



  private resolveAbsoluteFilePath(fileUrl: string) {

    const uploadsRoot = join(process.cwd(), 'uploads', 'ebooks');

    const normalized = fileUrl.trim();



    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {

      const marker = '/uploads/ebooks/';

      const index = normalized.indexOf(marker);

      if (index >= 0) {

        const relative = normalized.slice(index + marker.length);

        return join(uploadsRoot, relative);

      }

    }



    const relative = normalized

      .replace(/^\/+/, '')

      .replace(/^api\/v1\/uploads\/ebooks\//, '')

      .replace(/^uploads\/ebooks\//, '')

      .replace(/^ebooks\//, '');



    return join(uploadsRoot, relative);

  }



  async listUserLibrary(userId: string) {

    const purchases = await this.prisma.ebookPurchase.findMany({

      where: { userId },

      include: { ebook: true },

      orderBy: [{ purchasedAt: 'desc' }],

    });



    const progress = await this.prisma.readingProgress.findMany({

      where: { userId },

      include: { ebook: true },

      orderBy: [{ lastReadAt: 'desc' }],

    });



    const activeSubscription = await this.findPremiumSubscription(userId);



    const subscriptionEbooks =

      activeSubscription != null

        ? await this.prisma.ebook.findMany({

            where: {

              isPremium: true,

              deletedAt: null,

              status: ContentStatus.PUBLISHED,

            },

            orderBy: [{ createdAt: 'desc' }],

          })

        : [];



    const publishedFilter = (ebook: { deletedAt: Date | null; status: ContentStatus } | null) =>

      ebook != null && ebook.deletedAt == null && ebook.status === ContentStatus.PUBLISHED;



    const progressItems = progress

      .filter((item) => publishedFilter(item.ebook))

      .map((item) => this.toProgressResponse(item));



    return {

      purchased: purchases

        .map((entry) => entry.ebook)

        .filter(publishedFilter)

        .map((ebook) => this.toPublicResponse(ebook!)),

      subscription: subscriptionEbooks.map((ebook) => this.toPublicResponse(ebook)),

      continueReading: progressItems.filter((item) => !this.isCompleted(item)),

      downloads: progressItems.filter((item) => item.downloaded),

      history: progressItems,

      recentlyRead: progressItems.slice(0, 10),

    };

  }



  async getRecentlyRead(userId: string, limit = 10) {

    const progress = await this.prisma.readingProgress.findMany({

      where: { userId },

      include: { ebook: true },

      orderBy: [{ lastReadAt: 'desc' }],

      take: Math.min(limit, 50),

    });



    return {

      data: progress

        .filter(

          (item) =>

            item.ebook != null &&

            item.ebook.deletedAt == null &&

            item.ebook.status === ContentStatus.PUBLISHED,

        )

        .map((item) => this.toProgressResponse(item)),

    };

  }



  async getReadingProgress(userId: string, ebookId: string) {

    await this.findPublishedEbook(ebookId);

    const progress = await this.prisma.readingProgress.findUnique({

      where: { userId_ebookId: { userId, ebookId } },

      include: { ebook: true },

    });



    if (!progress) {

      return { data: null };

    }



    return { data: this.toProgressResponse(progress) };

  }



  async updateReadingProgress(

    userId: string,

    ebookId: string,

    payload: ReadingProgressDto,

  ) {

    const ebook = await this.findPublishedEbook(ebookId);

    await this.ensureReadingAccess(userId, ebook);



    const progressPct =

      payload.progressPct ??

      (payload.totalPages

        ? Math.min(100, (payload.currentPage / payload.totalPages) * 100)

        : undefined);



    const downloadedAt =

      payload.downloaded === true ? new Date() : payload.downloaded === false ? null : undefined;



    const progress = await this.prisma.readingProgress.upsert({

      where: { userId_ebookId: { userId, ebookId } },

      update: {

        currentPage: payload.currentPage,

        totalPages: payload.totalPages,

        progressPct,

        bookmarkPages: payload.bookmarkPages ?? Prisma.JsonNull,

        downloaded: payload.downloaded,

        ...(downloadedAt !== undefined ? { downloadedAt } : {}),

        lastReadAt: new Date(),

      },

      create: {

        userId,

        ebookId,

        currentPage: payload.currentPage,

        totalPages: payload.totalPages,

        progressPct: progressPct ?? 0,

        bookmarkPages: payload.bookmarkPages ?? Prisma.JsonNull,

        downloaded: payload.downloaded ?? false,

        downloadedAt: payload.downloaded ? new Date() : null,

        lastReadAt: new Date(),

      },

      include: { ebook: true },

    });



    return { data: this.toProgressResponse(progress) };

  }



  async recordDownload(userId: string, ebookId: string) {

    const ebook = await this.findPublishedEbook(ebookId);

    await this.ensureReadingAccess(userId, ebook);



    const progress = await this.prisma.readingProgress.upsert({

      where: { userId_ebookId: { userId, ebookId } },

      update: {

        downloaded: true,

        downloadedAt: new Date(),

      },

      create: {

        userId,

        ebookId,

        currentPage: 1,

        downloaded: true,

        downloadedAt: new Date(),

        lastReadAt: new Date(),

      },

      include: { ebook: true },

    });



    return { data: this.toProgressResponse(progress) };

  }



  private buildPublicWhere(query: EbookQueryDto): Prisma.EbookWhereInput {

    return {

      deletedAt: null,

      status: ContentStatus.PUBLISHED,

      ...(query.search

        ? {

            OR: [

              { title: { contains: query.search, mode: 'insensitive' } },

              { author: { contains: query.search, mode: 'insensitive' } },

              { description: { contains: query.search, mode: 'insensitive' } },

            ],

          }

        : {}),

      ...(query.category

        ? { category: { equals: query.category, mode: 'insensitive' } }

        : {}),

    };

  }



  private async findPublishedEbook(id: string) {

    const ebook = await this.prisma.ebook.findFirst({

      where: {

        id,

        deletedAt: null,

        status: ContentStatus.PUBLISHED,

      },

    });



    if (!ebook) {

      throw new NotFoundException('eBook not found');

    }



    return ebook;

  }



  private async ensureActiveEbook(id: string) {

    const ebook = await this.prisma.ebook.findFirst({

      where: { id, deletedAt: null },

    });



    if (!ebook) {

      throw new NotFoundException('eBook not found');

    }



    return ebook;

  }



  private async ensureReadingAccess(

    userId: string,

    ebook: { id: string; isPremium: boolean },

  ) {

    if (!ebook.isPremium) {

      return;

    }



    const [purchase, activeSubscription] = await Promise.all([

      this.prisma.ebookPurchase.findUnique({

        where: { userId_ebookId: { userId, ebookId: ebook.id } },

      }),

      this.findPremiumSubscription(userId),

    ]);



    if (!purchase && !activeSubscription) {

      throw new ForbiddenException(

        'Subscribe or purchase this eBook to track reading progress.',

      );

    }

  }



  private async findPremiumSubscription(userId: string) {

    const subscription = await this.prisma.userSubscription.findFirst({

      where: {

        userId,

        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] },

      },

      orderBy: [{ createdAt: 'desc' }],

    });



    if (!subscription) {

      return null;

    }



    if (

      subscription.status === SubscriptionStatus.GRACE &&

      subscription.graceEndsAt &&

      subscription.graceEndsAt.getTime() < Date.now()

    ) {

      return null;

    }



    return subscription;

  }



  private isCompleted(progress: {

    progressPct?: number | null;

    currentPage?: number | null;

    totalPages?: number | null;

  }) {

    if (typeof progress.progressPct === 'number' && progress.progressPct >= 99) {

      return true;

    }

    if (

      typeof progress.currentPage === 'number' &&

      typeof progress.totalPages === 'number' &&

      progress.totalPages > 0 &&

      progress.currentPage >= progress.totalPages

    ) {

      return true;

    }

    return false;

  }



  private toPublicResponse(ebook: {

    id: string;

    title: string;

    author: string | null;

    description: string | null;

    category: string | null;

    price: Prisma.Decimal;

    isPremium: boolean;

    fileUrl: string;

    coverUrl: string | null;

    status: ContentStatus;

    publishedAt: Date | null;

    createdAt: Date;

    updatedAt: Date;

    deletedAt?: Date | null;

  }) {

    return {

      id: ebook.id,

      title: ebook.title,

      author: ebook.author ?? '',

      description: ebook.description ?? '',

      category: ebook.category ?? 'GENERAL',

      price: Number(ebook.price),

      isPremium: ebook.isPremium,

      coverUrl: ebook.coverUrl,

      coverImage: ebook.coverUrl ?? '',

      status: ebook.status,

      isPublished: ebook.status === ContentStatus.PUBLISHED,

      publishedAt: ebook.publishedAt,

      createdAt: ebook.createdAt,

      updatedAt: ebook.updatedAt,

      deletedAt: ebook.deletedAt ?? null,

    };

  }



  private toAdminResponse(ebook: {

    id: string;

    title: string;

    author: string | null;

    description: string | null;

    category: string | null;

    price: Prisma.Decimal;

    isPremium: boolean;

    fileUrl: string;

    coverUrl: string | null;

    status: ContentStatus;

    publishedAt: Date | null;

    createdAt: Date;

    updatedAt: Date;

    deletedAt?: Date | null;

  }) {

    return {

      ...this.toPublicResponse(ebook),

      fileUrl: ebook.fileUrl,

      storageKey: this.resolveStorageKey(ebook.fileUrl),

    };

  }



  private resolveStorageKey(fileUrl: string) {

    const normalized = fileUrl.trim();

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {

      const marker = '/uploads/ebooks/';

      const index = normalized.indexOf(marker);

      if (index >= 0) {

        return normalized.slice(index + marker.length);

      }

    }

    return normalized

      .replace(/^\/+/, '')

      .replace(/^api\/v1\/uploads\/ebooks\//, '')

      .replace(/^uploads\/ebooks\//, '')

      .replace(/^ebooks\//, '');

  }



  private toProgressResponse(progress: {

    ebookId: string;

    currentPage: number;

    totalPages: number | null;

    progressPct: number;

    bookmarkPages: Prisma.JsonValue | null;

    downloaded: boolean;

    downloadedAt: Date | null;

    lastReadAt: Date;

    ebook?: {

      id: string;

      title: string;

      author: string | null;

      description: string | null;

      category: string | null;

      price: Prisma.Decimal;

      isPremium: boolean;

      fileUrl: string;

      coverUrl: string | null;

      status: ContentStatus;

      publishedAt: Date | null;

      createdAt: Date;

      updatedAt: Date;

      deletedAt?: Date | null;

    } | null;

  }) {

    const bookmarkPages = Array.isArray(progress.bookmarkPages)

      ? progress.bookmarkPages.map((value) => Number(value)).filter((value) => !Number.isNaN(value))

      : [];



    return {

      ebookId: progress.ebookId,

      currentPage: progress.currentPage,

      totalPages: progress.totalPages,

      progressPct: progress.progressPct,

      bookmarkPages,

      downloaded: progress.downloaded,

      downloadedAt: progress.downloadedAt,

      lastReadAt: progress.lastReadAt,

      completed: this.isCompleted(progress),

      ebook: progress.ebook ? this.toPublicResponse(progress.ebook) : null,

    };

  }



  private asRecord(value: Prisma.JsonValue | null): Record<string, unknown> {

    return value && typeof value === 'object' && !Array.isArray(value)

      ? (value as Record<string, unknown>)

      : {};

  }

}


