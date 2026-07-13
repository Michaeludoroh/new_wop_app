import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toPlainParagraphs(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

@Injectable()
export class EmailTemplateService {
  constructor(private readonly configService: ConfigService) {}

  private get appName() {
    return this.configService.get<string>('APP_NAME') ?? 'WOPP';
  }

  private get webAppUrl() {
    return (
      this.configService.get<string>('WEB_APP_URL') ??
      this.configService.get<string>('MOBILE_WEB_URL') ??
      'http://localhost:3001'
    );
  }

  welcomeEmail(fullName: string) {
    const safeName = escapeHtml(fullName);
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
    const html = `<p>Hello ${safeName},</p><p>Welcome to <strong>${escapeHtml(this.appName)}</strong>. Your account is ready.</p><p><a href="${escapeHtml(this.webAppUrl)}">Open the platform</a></p>`;
    return { subject, body, html };
  }

  passwordResetEmail(fullName: string, resetUrl: string) {
    const safeName = escapeHtml(fullName);
    const safeUrl = escapeHtml(resetUrl);
    const subject = `${this.appName} password reset`;
    const body = [
      `Hello ${fullName},`,
      '',
      'We received a request to reset your password.',
      `Use this link within 15 minutes: ${resetUrl}`,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = `<p>Hello ${safeName},</p><p>We received a request to reset your password.</p><p><a href="${safeUrl}">Reset your password</a></p><p>This link expires in 15 minutes.</p>`;
    return { subject, body, html };
  }

  passwordResetSuccessEmail(fullName: string) {
    const safeName = escapeHtml(fullName);
    const subject = `${this.appName} password updated`;
    const body = [
      `Hello ${fullName},`,
      '',
      'Your password was changed successfully.',
      'If you did not make this change, contact support immediately.',
      '',
      `${this.appName} Team`,
    ].join('\n');
    const html = `<p>Hello ${safeName},</p><p>Your password was changed successfully.</p><p>If you did not make this change, contact support immediately.</p>`;
    return { subject, body, html };
  }

  adminNotificationEmail(title: string, body: string) {
    const safeTitle = escapeHtml(title);
    const subject = title;
    const html = `<p>${toPlainParagraphs(body)}</p><p style="margin-top:24px;color:#666;font-size:12px;">Sent by ${escapeHtml(this.appName)}</p>`;
    return { subject, body, html: `<h2>${safeTitle}</h2>${html}` };
  }

  subscriptionConfirmationEmail(input: {
    fullName: string;
    planName: string;
    amountLabel: string;
    expiresAt?: Date | null;
    providerLabel?: string;
  }) {
    const safeName = escapeHtml(input.fullName);
    const safePlan = escapeHtml(input.planName);
    const expiryLine = input.expiresAt
      ? `Your current billing period ends on ${input.expiresAt.toISOString().slice(0, 10)}.`
      : 'Your premium access is now active.';
    const providerLine = input.providerLabel
      ? `Billing provider: ${input.providerLabel}.`
      : '';

    const subject = `${this.appName} subscription confirmed`;
    const body = [
      `Hello ${input.fullName},`,
      '',
      `Your ${input.planName} subscription is active (${input.amountLabel}).`,
      expiryLine,
      providerLine,
      '',
      `Manage your account at ${this.webAppUrl}.`,
      '',
      `${this.appName} Team`,
    ]
      .filter(Boolean)
      .join('\n');

    const html = [
      `<p>Hello ${safeName},</p>`,
      `<p>Your <strong>${safePlan}</strong> subscription is active (${escapeHtml(input.amountLabel)}).</p>`,
      `<p>${escapeHtml(expiryLine)}</p>`,
      providerLine ? `<p>${escapeHtml(providerLine)}</p>` : '',
      `<p><a href="${escapeHtml(this.webAppUrl)}">Open the platform</a></p>`,
    ]
      .filter(Boolean)
      .join('');

    return { subject, body, html };
  }

  contactFormAdminEmail(input: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const subject = `[Contact] ${input.subject}`;
    const body = [
      'New contact form submission:',
      '',
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Subject: ${input.subject}`,
      '',
      input.message,
    ].join('\n');
    const html = [
      '<p><strong>New contact form submission</strong></p>',
      `<p>Name: ${escapeHtml(input.name)}<br />Email: ${escapeHtml(input.email)}<br />Subject: ${escapeHtml(input.subject)}</p>`,
      `<p>${toPlainParagraphs(input.message)}</p>`,
    ].join('');
    return { subject, body, html };
  }

  contactFormAcknowledgementEmail(name: string) {
    const safeName = escapeHtml(name);
    const subject = `We received your message — ${this.appName}`;
    const body = [
      `Hello ${name},`,
      '',
      `Thanks for contacting ${this.appName}. Our team will review your message and respond soon.`,
      '',
      `${this.appName} Team`,
    ].join('\n');
    const html = `<p>Hello ${safeName},</p><p>Thanks for contacting <strong>${escapeHtml(this.appName)}</strong>. Our team will review your message and respond soon.</p>`;
    return { subject, body, html };
  }

  policyUpdateEmail(fullName: string, policyTitle: string, version: number) {
    const safeName = escapeHtml(fullName);
    const safeTitle = escapeHtml(policyTitle);
    const subject = `${policyTitle} updated (v${version})`;
    const body = [
      `Hello ${fullName},`,
      '',
      `${policyTitle} has been updated to version ${version}.`,
      `Please review and accept the updated policy in the ${this.appName} app.`,
      '',
      `${this.appName} Team`,
    ].join('\n');
    const html = `<p>Hello ${safeName},</p><p><strong>${safeTitle}</strong> has been updated to version ${version}.</p><p>Please review and accept the updated policy in the app.</p>`;
    return { subject, body, html };
  }

  buildPasswordResetUrl(rawToken: string) {
    const base = this.webAppUrl.replace(/\/$/, '');
    return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
  }

  buildEmailVerificationUrl(rawToken: string) {
    const base = this.webAppUrl.replace(/\/$/, '');
    return `${base}/verify-email?token=${encodeURIComponent(rawToken)}`;
  }

  private get supportEmail() {
    return (
      this.configService.get<string>('CONTACT_ADMIN_EMAIL') ??
      this.configService.get<string>('SUPPORT_EMAIL') ??
      'support@example.com'
    );
  }

  private get logoUrl() {
    const configured = this.configService.get<string>('EMAIL_LOGO_URL');
    if (configured?.trim()) {
      return configured.trim();
    }
    const base = this.webAppUrl.replace(/\/$/, '');
    return `${base}/logo.png`;
  }

  emailVerificationEmail(fullName: string, verifyUrl: string, ttlMinutes: number) {
    const safeName = escapeHtml(fullName);
    const safeUrl = escapeHtml(verifyUrl);
    const safeSupport = escapeHtml(this.supportEmail);
    const subject = 'Verify your WOPP account';
    const body = [
      `Hello ${fullName},`,
      '',
      'Thanks for creating your WOPP account.',
      'Please verify your email address to unlock premium features.',
      '',
      `Verify your account: ${verifyUrl}`,
      '',
      `This link expires in ${ttlMinutes} minutes.`,
      '',
      `Need help? Contact ${this.supportEmail}.`,
      '',
      `${this.appName} Team`,
    ].join('\n');

    const html = [
      `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">`,
      `<img src="${escapeHtml(this.logoUrl)}" alt="${escapeHtml(this.appName)}" style="max-height:64px;margin-bottom:24px;" />`,
      `<p>Hello ${safeName},</p>`,
      `<p>Thanks for creating your <strong>${escapeHtml(this.appName)}</strong> account.</p>`,
      `<p>Please verify your email address to unlock premium features.</p>`,
      `<p style="margin:28px 0;"><a href="${safeUrl}" style="background:#6941c6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Verify your account</a></p>`,
      `<p style="color:#667085;font-size:14px;">This link expires in ${ttlMinutes} minutes.</p>`,
      `<p style="color:#667085;font-size:14px;">If the button does not work, copy and paste this URL into your browser:<br /><span style="word-break:break-all;">${safeUrl}</span></p>`,
      `<p style="color:#667085;font-size:14px;">Need help? Contact <a href="mailto:${safeSupport}">${safeSupport}</a>.</p>`,
      `</div>`,
    ].join('');

    return { subject, body, html };
  }
}
