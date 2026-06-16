import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, User } from '@prisma/client';
import { AppRole } from './auth.types';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthTokens, AuthUserPayload, AuthUserResponse } from './auth.types';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';

type SessionMetadata = {
  deviceId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async register(dto: RegisterDto, metadata?: SessionMetadata) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        role: Role.USER,
      },
    });

    const tokens = await this.issueTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken, metadata);

    const welcome = this.emailTemplateService.welcomeEmail(user.fullName);
    await this.emailService.send([
      {
        to: user.email,
        subject: welcome.subject,
        body: welcome.body,
        html: welcome.html,
        dedupeKey: `welcome:${user.id}`,
      },
    ]).catch(() => undefined);

    return {
      user: this.toAuthUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto, metadata?: SessionMetadata) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.cleanupRefreshSessions(user.id);
    const tokens = await this.issueTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken, metadata);
    await this.enforceMaxActiveSessions(user.id);

    return {
      user: this.toAuthUser(user),
      ...tokens,
    };
  }

  async logout(dto: LogoutDto) {
    const refreshTokenHash = this.hashToken(dto.refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: refreshTokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  async refresh(dto: RefreshTokenDto, metadata?: SessionMetadata) {
    const refreshTokenHash = this.hashToken(dto.refreshToken);
    const session = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const now = new Date();
    await this.cleanupRefreshSessions(session.user.id);

    const tokens = await this.issueTokens(session.user);

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: session.id },
        data: {
          revokedAt: now,
          lastUsedAt: now,
        },
      });

      await this.storeRefreshToken(
        session.user.id,
        tokens.refreshToken,
        metadata,
        tx,
      );
      await this.enforceMaxActiveSessions(session.user.id, tx);
    });

    return {
      user: this.toAuthUser(session.user),
      ...tokens,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      return {
        message: 'If the email exists, a reset link has been generated',
      };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const resetUrl = this.emailTemplateService.buildPasswordResetUrl(rawToken);
    const resetEmail = this.emailTemplateService.passwordResetEmail(
      user.fullName,
      resetUrl,
    );
    await this.emailService.send([
      {
        to: user.email,
        subject: resetEmail.subject,
        body: resetEmail.body,
        html: resetEmail.html,
        dedupeKey: `password-reset:${user.id}:${tokenHash.slice(0, 12)}`,
      },
    ]).catch(() => undefined);

    return {
      message: 'If the email exists, a reset link has been generated',
      ...(process.env.NODE_ENV !== 'production'
        ? {
            resetToken: rawToken,
            expiresAt,
          }
        : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    return { message: 'Password reset successful' };
  }

  async me(userId: string): Promise<AuthUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toAuthUser(user);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: AuthUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as AppRole,
    };

    const accessTokenExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshTokenExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessTokenExpiresIn as never,
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        ...payload,
        jti: randomUUID(),
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiresIn as never,
      },
    );

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    metadata?: SessionMetadata,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const tokenHash = this.hashToken(refreshToken);
    const now = new Date();
    const expiresAt = this.calculateRefreshExpiry();

    await client.refreshToken.upsert({
      where: { tokenHash },
      update: {
        userId,
        expiresAt,
        revokedAt: null,
        lastUsedAt: now,
        deviceId: metadata?.deviceId ?? null,
        userAgent: metadata?.userAgent ?? null,
        ipAddress: metadata?.ipAddress ?? null,
      },
      create: {
        userId,
        tokenHash,
        expiresAt,
        lastUsedAt: now,
        deviceId: metadata?.deviceId ?? null,
        userAgent: metadata?.userAgent ?? null,
        ipAddress: metadata?.ipAddress ?? null,
      },
    });
  }

  private async enforceMaxActiveSessions(
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const maxSessions = Number(
      this.configService.get<string>('AUTH_MAX_ACTIVE_SESSIONS') ?? '5',
    );

    if (!Number.isFinite(maxSessions) || maxSessions < 1) {
      return;
    }

    const activeSessions = await client.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: [{ createdAt: 'asc' }],
      select: { id: true },
    });

    if (activeSessions.length <= maxSessions) {
      return;
    }

    const overflow = activeSessions.length - maxSessions;
    const idsToRevoke = activeSessions.slice(0, overflow).map((s) => s.id);

    await client.refreshToken.updateMany({
      where: { id: { in: idsToRevoke } },
      data: { revokedAt: new Date() },
    });
  }

  private async cleanupRefreshSessions(userId: string) {
    const staleDays = Number(
      this.configService.get<string>('AUTH_SESSION_STALE_DAYS') ?? '30',
    );
    const now = new Date();
    const staleCutoff = new Date(
      now.getTime() -
        (Number.isFinite(staleDays) && staleDays > 0 ? staleDays : 30) *
          24 *
          60 *
          60 *
          1000,
    );

    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        OR: [
          { revokedAt: { not: null } },
          { expiresAt: { lte: now } },
          {
            revokedAt: null,
            lastUsedAt: { lte: staleCutoff },
          },
        ],
      },
    });
  }

  private calculateRefreshExpiry() {
    const days = Number(this.configService.get<string>('JWT_REFRESH_DAYS') ?? 7);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private toAuthUser(user: User): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as AppRole,
    };
  }
}
