import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailHealthController } from './email-health.controller';
import { createEmailProviderRegistry, resolveActiveEmailProvider } from './email-provider.factory';
import { EmailReadinessService } from './email-readiness.service';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { EMAIL_PROVIDER_TOKEN } from './email.provider.interface';
import { MockEmailProvider } from './providers/mock-email.provider';
import {
  AwsSesEmailProvider,
  BrevoEmailProvider,
  GenericSmtpEmailProvider,
  MailgunEmailProvider,
  PostmarkEmailProvider,
  SendGridEmailProvider,
} from './providers/smtp-providers';
import { SmtpTransportService } from './smtp-transport.service';
import { PlatformHealthController } from './platform-health.controller';
import { PlatformHealthService } from './platform-health.service';

@Module({
  controllers: [EmailHealthController, PlatformHealthController],
  providers: [
    EmailService,
    EmailTemplateService,
    EmailReadinessService,
    PlatformHealthService,
    SmtpTransportService,
    MockEmailProvider,
    BrevoEmailProvider,
    AwsSesEmailProvider,
    SendGridEmailProvider,
    MailgunEmailProvider,
    PostmarkEmailProvider,
    GenericSmtpEmailProvider,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      inject: [
        ConfigService,
        MockEmailProvider,
        BrevoEmailProvider,
        AwsSesEmailProvider,
        SendGridEmailProvider,
        MailgunEmailProvider,
        PostmarkEmailProvider,
        GenericSmtpEmailProvider,
      ],
      useFactory: (
        configService: ConfigService,
        mock: MockEmailProvider,
        brevo: BrevoEmailProvider,
        aws: AwsSesEmailProvider,
        sendgrid: SendGridEmailProvider,
        mailgun: MailgunEmailProvider,
        postmark: PostmarkEmailProvider,
        smtp: GenericSmtpEmailProvider,
      ) => {
        const env = {
          EMAIL_PROVIDER: configService.get<string>('EMAIL_PROVIDER'),
          SMTP_HOST: configService.get<string>('SMTP_HOST'),
        };

        const registry = createEmailProviderRegistry({
          mock,
          brevo,
          aws,
          sendgrid,
          mailgun,
          postmark,
          smtp,
        });

        return resolveActiveEmailProvider(env, registry);
      },
    },
  ],
  exports: [EmailService, EmailTemplateService, EmailReadinessService, PlatformHealthService],
})
export class EmailModule {}
