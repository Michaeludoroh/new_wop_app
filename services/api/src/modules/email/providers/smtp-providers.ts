import { Injectable } from '@nestjs/common';
import { BaseSmtpEmailProvider } from './base-smtp-email.provider';

@Injectable()
export class BrevoEmailProvider extends BaseSmtpEmailProvider {
  readonly providerName = 'brevo' as const;
  readonly displayName = 'Brevo';
}

@Injectable()
export class AwsSesEmailProvider extends BaseSmtpEmailProvider {
  readonly providerName = 'aws' as const;
  readonly displayName = 'AWS SES';
}

@Injectable()
export class SendGridEmailProvider extends BaseSmtpEmailProvider {
  readonly providerName = 'sendgrid' as const;
  readonly displayName = 'SendGrid';
}

@Injectable()
export class MailgunEmailProvider extends BaseSmtpEmailProvider {
  readonly providerName = 'mailgun' as const;
  readonly displayName = 'Mailgun';
}

@Injectable()
export class PostmarkEmailProvider extends BaseSmtpEmailProvider {
  readonly providerName = 'postmark' as const;
  readonly displayName = 'Postmark';
}

@Injectable()
export class GenericSmtpEmailProvider extends BaseSmtpEmailProvider {
  readonly providerName = 'smtp' as const;
  readonly displayName = 'SMTP';
}
