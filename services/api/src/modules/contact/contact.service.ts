import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';
import { SubmitContactDto } from './dto/submit-contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async submitContactForm(dto: SubmitContactDto) {
    const adminRecipient = this.resolveAdminRecipient();
    if (!adminRecipient) {
      throw new BadRequestException({
        code: 'CONTACT_EMAIL_NOT_CONFIGURED',
        message: 'Contact form is temporarily unavailable',
      });
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const dedupeSeed = `${normalizedEmail}:${dto.subject}:${dto.message.slice(0, 64)}`;
    const dedupeKey = `contact:${createHash('sha256').update(dedupeSeed).digest('hex').slice(0, 24)}`;

    const adminEmail = this.emailTemplateService.contactFormAdminEmail({
      name: dto.name.trim(),
      email: normalizedEmail,
      subject: dto.subject.trim(),
      message: dto.message.trim(),
    });
    const acknowledgement = this.emailTemplateService.contactFormAcknowledgementEmail(
      dto.name.trim(),
    );

    await this.emailService.send([
      {
        to: adminRecipient,
        subject: adminEmail.subject,
        body: adminEmail.body,
        html: adminEmail.html,
        dedupeKey: `${dedupeKey}:admin`,
      },
      {
        to: normalizedEmail,
        subject: acknowledgement.subject,
        body: acknowledgement.body,
        html: acknowledgement.html,
        dedupeKey: `${dedupeKey}:ack`,
      },
    ]);

    this.logger.log(`Contact form submitted by ${normalizedEmail}`);

    return {
      message: 'Your message has been sent. We will respond soon.',
    };
  }

  private resolveAdminRecipient(): string | null {
    const configured =
      this.configService.get<string>('CONTACT_ADMIN_EMAIL')?.trim() ||
      this.configService.get<string>('SUPPORT_EMAIL')?.trim();
    return configured || null;
  }
}
