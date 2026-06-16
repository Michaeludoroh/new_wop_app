import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailTemplateService {
  constructor(private readonly configService: ConfigService) {}

  private get appName() {
    return this.configService.get<string>('APP_NAME') ?? 'WOP Platform';
  }

  private get webAppUrl() {
    return (
      this.configService.get<string>('WEB_APP_URL') ??
      this.configService.get<string>('MOBILE_WEB_URL') ??
      'http://localhost:3001'
    );
  }

  welcomeEmail(fullName: string) {
    const subject = `Welcome to ${this.appName}`;
    const body = [
      `Hello ${fullName},`,
      '',
      `Welcome to ${this.appName}. Your account is ready.`,
      `Sign in anytime at ${this.webAppUrl}.`,
      '',
      'Blessings,',
      `${this.appName} Team`,
    ].join('\n');
    const html = `<p>Hello ${fullName},</p><p>Welcome to <strong>${this.appName}</strong>. Your account is ready.</p><p><a href="${this.webAppUrl}">Open the platform</a></p>`;
    return { subject, body, html };
  }

  passwordResetEmail(fullName: string, resetUrl: string) {
    const subject = `${this.appName} password reset`;
    const body = [
      `Hello ${fullName},`,
      '',
      'We received a request to reset your password.',
      `Use this link within 15 minutes: ${resetUrl}`,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = `<p>Hello ${fullName},</p><p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 15 minutes.</p>`;
    return { subject, body, html };
  }

  policyUpdateEmail(fullName: string, policyTitle: string, version: number) {
    const subject = `${policyTitle} updated (v${version})`;
    const body = [
      `Hello ${fullName},`,
      '',
      `${policyTitle} has been updated to version ${version}.`,
      `Please review and accept the updated policy in the ${this.appName} app.`,
      '',
      `${this.appName} Team`,
    ].join('\n');
    const html = `<p>Hello ${fullName},</p><p><strong>${policyTitle}</strong> has been updated to version ${version}.</p><p>Please review and accept the updated policy in the app.</p>`;
    return { subject, body, html };
  }

  buildPasswordResetUrl(rawToken: string) {
    const base = this.webAppUrl.replace(/\/$/, '');
    return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
  }
}
