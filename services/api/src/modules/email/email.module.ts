import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailHealthController } from './email-health.controller';
import { EmailReadinessService } from './email-readiness.service';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { MockSmtpProvider } from './mock-smtp.provider';
import { SmtpEmailProvider } from './smtp-email.provider';

@Module({
  controllers: [EmailHealthController],
  providers: [
    EmailService,
    EmailTemplateService,
    EmailReadinessService,
    MockSmtpProvider,
    SmtpEmailProvider,
    {
      provide: 'EMAIL_PROVIDER',
      inject: [ConfigService, MockSmtpProvider, SmtpEmailProvider],
      useFactory: (
        configService: ConfigService,
        mockProvider: MockSmtpProvider,
        smtpProvider: SmtpEmailProvider,
      ) => {
        const host = configService.get<string>('SMTP_HOST');
        return host?.trim() ? smtpProvider : mockProvider;
      },
    },
  ],
  exports: [EmailService, EmailTemplateService, EmailReadinessService],
})
export class EmailModule {}
