import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const RESEND_COOLDOWN_MS = 60_000;

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  isVerificationRequired(): boolean {
    return this.configService.get<string>('REQUIRE_EMAIL_VERIFICATION') === 'true';
  }

  getTokenTtlMinutes(): number {
    const raw = Number(
      this.configService.get<string>('EMAIL_VERIFICATION_TOKEN_TTL_MINUTES') ?? 60,
    );
    return Number.isFinite(raw) && raw > 0 ? raw : 60;
  }

  hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  genericSendResponse() {
    return {
      message:
        'If your account requires verification, a verification link has been sent.',
    };
  }

  async issueAndSendVerificationEmail(user: Pick<User, 'id' | 'email' | 'fullName' | 'emailVerified'>) {
    if (user.emailVerified) {
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.getTokenTtlMinutes() * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    const verifyUrl = this.emailTemplateService.buildEmailVerificationUrl(rawToken);
    const email = this.emailTemplateService.emailVerificationEmail(
      user.fullName,
      verifyUrl,
      this.getTokenTtlMinutes(),
    );

    await this.emailService.send([
      {
        to: user.email,
        subject: email.subject,
        body: email.body,
        html: email.html,
        dedupeKey: `email-verify:${user.id}:${tokenHash.slice(0, 12)}`,
      },
    ]);
  }

  async sendVerificationEmailForUserId(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.deletedAt || user.emailVerified) {
      return this.genericSendResponse();
    }

    const cooldownRemaining = this.getResendCooldownRemaining(user);
    if (cooldownRemaining > 0) {
      return this.genericSendResponse();
    }

    await this.issueAndSendVerificationEmail(user).catch(() => undefined);
    return this.genericSendResponse();
  }

  async verifyEmailToken(rawToken: string) {
    const trimmed = rawToken?.trim();
    if (!trimmed) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const tokenHash = this.hashToken(trimmed);
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationTokenHash: tokenHash },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      await this.clearVerificationToken(user.id);
      return {
        message: 'Email already verified',
        alreadyVerified: true,
      };
    }

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: now,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    await this.completePostVerification(user.id, user.fullName, user.email);

    return { message: 'Email verified successfully' };
  }

  async adminVerifyEmail(userId: string, adminUserId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      return user;
    }

    const now = new Date();
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: now,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    await this.completePostVerification(userId, user.fullName, user.email, {
      skipWelcomeEmail: true,
    });

    await this.createAuditLog(adminUserId, 'EMAIL_VERIFIED_MANUAL', userId, {
      targetEmail: user.email,
    });

    return updated;
  }

  async adminResendVerificationEmail(userId: string, adminUserId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      return this.genericSendResponse();
    }

    await this.issueAndSendVerificationEmail(user).catch(() => undefined);

    await this.createAuditLog(adminUserId, 'EMAIL_VERIFICATION_RESENT', userId, {
      targetEmail: user.email,
    });

    return this.genericSendResponse();
  }

  private getResendCooldownRemaining(user: Pick<User, 'updatedAt' | 'emailVerificationExpiresAt'>) {
    if (!user.emailVerificationExpiresAt) {
      return 0;
    }

    const elapsed = Date.now() - user.updatedAt.getTime();
    return Math.max(0, RESEND_COOLDOWN_MS - elapsed);
  }

  private async clearVerificationToken(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });
  }

  private async completePostVerification(
    userId: string,
    fullName: string,
    email: string,
    options?: { skipWelcomeEmail?: boolean },
  ) {
    await this.subscriptionsService.initializeRegistrationTrial(userId).catch(() => undefined);

    if (options?.skipWelcomeEmail) {
      return;
    }

    const welcome = this.emailTemplateService.welcomeEmail(fullName);
    await this.emailService
      .send([
        {
          to: email,
          subject: welcome.subject,
          body: welcome.body,
          html: welcome.html,
          dedupeKey: `welcome:${userId}`,
        },
      ])
      .catch(() => undefined);
  }

  private async createAuditLog(
    adminUserId: string,
    action: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action,
        resource: 'USER',
        resourceId,
        metadata: metadata as Prisma.JsonObject,
      },
    });
  }
}
