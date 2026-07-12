import { ConfigService } from '@nestjs/config';

export function readJwtAccessSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_ACCESS_SECRET')?.trim();
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is required');
  }
  return secret;
}

export function readJwtRefreshSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_REFRESH_SECRET')?.trim();
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is required');
  }
  return secret;
}
