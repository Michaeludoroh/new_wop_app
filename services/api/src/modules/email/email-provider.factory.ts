import { EmailProvider, EmailProviderName } from './email.provider.interface';
import { AwsSesEmailProvider } from './providers/smtp-providers';
import { BrevoEmailProvider } from './providers/smtp-providers';
import { GenericSmtpEmailProvider } from './providers/smtp-providers';
import { MailgunEmailProvider } from './providers/smtp-providers';
import { MockEmailProvider } from './providers/mock-email.provider';
import { PostmarkEmailProvider } from './providers/smtp-providers';
import { SendGridEmailProvider } from './providers/smtp-providers';
import { EmailProviderId, resolveEmailProviderId } from './email-config.util';

type ProviderRegistry = Record<EmailProviderId, EmailProvider>;

export function createEmailProviderRegistry(providers: {
  mock: MockEmailProvider;
  brevo: BrevoEmailProvider;
  aws: AwsSesEmailProvider;
  sendgrid: SendGridEmailProvider;
  mailgun: MailgunEmailProvider;
  postmark: PostmarkEmailProvider;
  smtp: GenericSmtpEmailProvider;
}): ProviderRegistry {
  return providers;
}

export function resolveActiveEmailProvider(
  env: Record<string, string | undefined>,
  registry: ProviderRegistry,
): EmailProvider {
  const providerId = resolveEmailProviderId(env);
  return registry[providerId];
}

export function resolveActiveEmailProviderName(
  env: Record<string, string | undefined>,
): EmailProviderName {
  return resolveEmailProviderId(env);
}
