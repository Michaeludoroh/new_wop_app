import { ValidationPipe } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidUnknownValues: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: false },
  validationError: { target: false, value: false },
});

describe('Announcements DTO validation hardening', () => {
  it('title: 123 => 400', async () => {
    const payload = { title: 123, content: 'ok' };
    await expect(
      pipe.transform(payload, {
        type: 'body',
        metatype: CreateAnnouncementDto,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('content: {} => 400', async () => {
    const payload = { title: 'ok', content: {} };
    await expect(
      pipe.transform(payload, {
        type: 'body',
        metatype: CreateAnnouncementDto,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('invalid category => 400', async () => {
    const payload = {
      title: 'ok',
      content: 'ok',
      category: 'INVALID_CATEGORY',
    };
    await expect(
      pipe.transform(payload, {
        type: 'body',
        metatype: CreateAnnouncementDto,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
