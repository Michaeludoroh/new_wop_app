import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

const ACCESS_SECRET = 'A'.repeat(48);
const REFRESH_SECRET = 'B'.repeat(48);

describe('Auth JWT integration', () => {
  let app: INestApplication;

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const authService = {
    me: jest.fn(async (userId: string) => ({
      id: userId,
      email: 'superadmin@wop.local',
      fullName: 'Seeded Super Admin',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      emailVerifiedAt: '2026-01-01T00:00:00.000Z',
      requireEmailVerification: true,
    })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'JWT_ACCESS_SECRET') return ACCESS_SECRET;
              if (key === 'JWT_REFRESH_SECRET') return REFRESH_SECRET;
              return undefined;
            },
          },
        },
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: ACCESS_SECRET,
            signOptions: { algorithm: 'HS256' },
          }),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-super-admin',
      email: 'superadmin@wop.local',
      role: Role.SUPER_ADMIN,
      deletedAt: null,
    });
  });

  it('returns 200 for GET /auth/me with a valid access token', async () => {
    const jwtService = new JwtService({
      secret: ACCESS_SECRET,
      signOptions: { algorithm: 'HS256' },
    });
    const accessToken = await jwtService.signAsync({
      sub: 'user-super-admin',
      email: 'superadmin@wop.local',
      role: 'SUPER_ADMIN',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: 'user-super-admin',
      email: 'superadmin@wop.local',
      role: 'SUPER_ADMIN',
    });
    expect(authService.me).toHaveBeenCalledWith('user-super-admin');
  });

  it('returns 401 when the user no longer exists in the database', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const jwtService = new JwtService({
      secret: ACCESS_SECRET,
      signOptions: { algorithm: 'HS256' },
    });
    const accessToken = await jwtService.signAsync({
      sub: 'missing-user',
      email: 'missing@wop.local',
      role: 'SUPER_ADMIN',
    });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });

  it('returns 401 when token role no longer matches the database role', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-super-admin',
      email: 'superadmin@wop.local',
      role: Role.USER,
      deletedAt: null,
    });
    const jwtService = new JwtService({
      secret: ACCESS_SECRET,
      signOptions: { algorithm: 'HS256' },
    });
    const accessToken = await jwtService.signAsync({
      sub: 'user-super-admin',
      email: 'superadmin@wop.local',
      role: 'SUPER_ADMIN',
    });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });

  it('returns 401 when signed with the refresh secret', async () => {
    const jwtService = new JwtService({
      secret: REFRESH_SECRET,
      signOptions: { algorithm: 'HS256' },
    });
    const refreshAsAccess = await jwtService.signAsync({
      sub: 'user-super-admin',
      email: 'superadmin@wop.local',
      role: 'SUPER_ADMIN',
    });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refreshAsAccess}`)
      .expect(401);
  });
});
