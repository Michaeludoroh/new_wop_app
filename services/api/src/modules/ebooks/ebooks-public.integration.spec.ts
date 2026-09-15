import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ContentStatus, Prisma, Role } from '@prisma/client';
import * as request from 'supertest';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { ContentAccessService } from '../subscriptions/content-access.service';
import { EbooksPublicController } from './ebooks-public.controller';
import { EbooksStreamController } from './ebooks-stream.controller';
import { EbooksController } from './ebooks.controller';
import { EbooksService } from './ebooks.service';
import { EbooksUploadService } from './ebooks-upload.service';

const ACCESS_SECRET = 'A'.repeat(48);

const publishedEbook = {
  id: 'ebook_public_1',
  title: 'Purpose Driven Living',
  author: 'WOPP Ministry',
  description: 'A guest-browsable catalog entry',
  category: 'GROWTH',
  price: new Prisma.Decimal(10),
  isPremium: true,
  fileUrl: 'ebooks/file/secret-manuscript.pdf',
  coverUrl: 'ebooks/cover/cover.png',
  status: ContentStatus.PUBLISHED,
  publishedAt: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  deletedAt: null,
};

const PUBLIC_RESPONSE_KEYS = [
  'author',
  'category',
  'coverImage',
  'coverUrl',
  'createdAt',
  'deletedAt',
  'description',
  'id',
  'isPremium',
  'isPublished',
  'price',
  'publishedAt',
  'status',
  'title',
  'updatedAt',
];

// Fields that would leak paid content, admin internals, or another member's data.
const FORBIDDEN_RESPONSE_KEYS = [
  'fileUrl',
  'storageKey',
  'downloadUrl',
  'accessToken',
  'purchase',
  'purchases',
  'purchased',
  'subscription',
  'subscriptions',
  'progress',
  'readingProgress',
  'library',
  'user',
  'userId',
  'email',
  'downloadCount',
  'revenue',
];

describe('Guest ebook browsing integration', () => {
  let app: INestApplication;

  const prisma = {
    ebook: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      // Registration order mirrors EbooksModule so `ebooks/public` is matched
      // before the JWT-protected `ebooks/:id` wildcard.
      controllers: [EbooksPublicController, EbooksController, EbooksStreamController],
      providers: [
        EbooksService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: { createTargeted: jest.fn() } },
        {
          provide: ContentAccessService,
          useValue: {
            issueAccessToken: jest.fn(),
            validateAccessToken: jest.fn(),
            validateResourceAccessToken: jest.fn(),
          },
        },
        { provide: EbooksUploadService, useValue: { saveUpload: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'JWT_ACCESS_SECRET') return ACCESS_SECRET;
              if (key === 'API_PUBLIC_URL') return 'https://woppandmopp.com';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
        validationError: { target: false, value: false },
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.ebook.findMany.mockResolvedValue([publishedEbook]);
    prisma.ebook.findFirst.mockResolvedValue(publishedEbook);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'member@wop.local',
      role: Role.USER,
      deletedAt: null,
    });
  });

  describe('GET /ebooks/public', () => {
    it('serves the catalog to an unauthenticated guest', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ebooks/public')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: 'ebook_public_1',
        title: 'Purpose Driven Living',
      });
      expect(response.body.featured).toBeDefined();
      expect(response.body.recent).toBeDefined();
    });

    it('queries only published, non-deleted ebooks', async () => {
      await request(app.getHttpServer()).get('/api/v1/ebooks/public').expect(200);

      expect(prisma.ebook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            status: ContentStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('accepts public catalog filters without a token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/ebooks/public?search=purpose&recent=true')
        .expect(200);

      expect(prisma.ebook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'purpose', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('exposes only public catalog fields in every list bucket', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ebooks/public')
        .expect(200);

      const entries = [
        ...response.body.data,
        ...response.body.featured,
        ...response.body.recent,
      ];
      expect(entries.length).toBeGreaterThan(0);

      entries.forEach((entry: Record<string, unknown>) => {
        expect(Object.keys(entry).sort()).toEqual(PUBLIC_RESPONSE_KEYS);
        FORBIDDEN_RESPONSE_KEYS.forEach((key) => {
          expect(entry).not.toHaveProperty(key);
        });
      });

      expect(JSON.stringify(response.body)).not.toContain('secret-manuscript');
    });
  });

  describe('GET /ebooks/public/:id', () => {
    it('serves ebook details to an unauthenticated guest', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ebooks/public/ebook_public_1')
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: 'ebook_public_1',
        isPremium: true,
        price: 10,
      });
      expect(Object.keys(response.body.data).sort()).toEqual(PUBLIC_RESPONSE_KEYS);
      FORBIDDEN_RESPONSE_KEYS.forEach((key) => {
        expect(response.body.data).not.toHaveProperty(key);
      });
      expect(JSON.stringify(response.body)).not.toContain('secret-manuscript');
    });

    it('resolves unpublished or missing ebooks as 404 rather than leaking them', async () => {
      prisma.ebook.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/ebooks/public/ebook_draft_1')
        .expect(404);

      expect(prisma.ebook.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'ebook_draft_1',
            deletedAt: null,
            status: ContentStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('does not read any per-user table while serving guests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/ebooks/public/ebook_public_1')
        .expect(200);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('private ebook endpoints', () => {
    it.each([
      ['get', '/api/v1/ebooks'],
      ['get', '/api/v1/ebooks/library'],
      ['get', '/api/v1/ebooks/recently-read'],
      ['get', '/api/v1/ebooks/admin'],
      ['get', '/api/v1/ebooks/admin/analytics'],
      ['get', '/api/v1/ebooks/ebook_public_1'],
      ['get', '/api/v1/ebooks/ebook_public_1/access'],
      ['get', '/api/v1/ebooks/ebook_public_1/progress'],
      ['post', '/api/v1/ebooks/ebook_public_1/progress'],
      ['post', '/api/v1/ebooks/ebook_public_1/download'],
      ['post', '/api/v1/ebooks/purchase'],
    ])('rejects unauthenticated %s %s with 401', async (method, url) => {
      await request(app.getHttpServer())[method as 'get' | 'post'](url).expect(401);
    });

    it('rejects a malformed bearer token on private routes', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/ebooks/library')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });
});
