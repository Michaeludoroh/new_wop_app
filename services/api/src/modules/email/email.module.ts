import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { MockSmtpProvider } from './mock-smtp.provider';
import { SmtpEmailProvider } from './smtp-email.provider';

@Module({
  providers: [
    EmailService,
    EmailTemplateService,
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
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}
