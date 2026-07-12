import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  function createService(env: Record<string, string | undefined> = {}) {
    const emailService = {
      send: jest.fn().mockResolvedValue({ provider: 'MOCK_SMTP', attempts: [] }),
    };
    const emailTemplateService = {
      contactFormAdminEmail: jest.fn().mockReturnValue({
        subject: 'Admin subject',
        body: 'Admin body',
        html: '<p>Admin body</p>',
      }),
      contactFormAcknowledgementEmail: jest.fn().mockReturnValue({
        subject: 'Thanks',
        body: 'Ack body',
        html: '<p>Ack body</p>',
      }),
    };
    const configService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;

    return {
      service: new ContactService(
        emailService as never,
        emailTemplateService as never,
        configService,
      ),
      emailService,
    };
  }

  it('rejects submissions when admin recipient is not configured', async () => {
    const { service } = createService();
    await expect(
      service.submitContactForm({
        name: 'Jane',
        email: 'jane@example.com',
        subject: 'Help',
        message: 'Need support',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sends admin and acknowledgement emails', async () => {
    const { service, emailService } = createService({
      CONTACT_ADMIN_EMAIL: 'support@example.com',
    });

    const result = await service.submitContactForm({
      name: 'Jane Doe',
      email: 'jane@example.com',
      subject: 'Help',
      message: 'Need support',
    });

    expect(result.message).toContain('sent');
    expect(emailService.send).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ to: 'support@example.com', html: expect.any(String) }),
        expect.objectContaining({ to: 'jane@example.com', html: expect.any(String) }),
      ]),
    );
  });
});
