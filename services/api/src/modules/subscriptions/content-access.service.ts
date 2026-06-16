import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

type ContentResourceType = 'ebook' | 'clip' | 'program';

type ContentAccessPayload = {
  sub: string;
  resourceType: ContentResourceType;
  resourceId: string;
  exp: number;
};

@Injectable()
export class ContentAccessService {
  constructor(private readonly configService: ConfigService) {}

  issueAccessToken(
    userId: string,
    resourceType: ContentResourceType,
    resourceId: string,
    expiresInSeconds = 900,
  ) {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload: ContentAccessPayload = {
      sub: userId,
      resourceType,
      resourceId,
      exp,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.sign(encoded);
    return {
      accessToken: `${encoded}.${signature}`,
      expiresInSeconds,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  validateResourceAccessToken(
    token: string,
    expected: { resourceType: ContentResourceType; resourceId: string },
  ) {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) {
      return { valid: false as const, reason: 'malformed_token' };
    }

    const expectedSignature = this.sign(encoded);
    const provided = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      provided.length !== expectedBuffer.length ||
      !timingSafeEqual(provided, expectedBuffer)
    ) {
      return { valid: false as const, reason: 'invalid_signature' };
    }

    let payload: ContentAccessPayload;
    try {
      payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ContentAccessPayload;
    } catch {
      return { valid: false as const, reason: 'invalid_payload' };
    }

    if (payload.resourceType !== expected.resourceType) {
      return { valid: false as const, reason: 'resource_type_mismatch' };
    }
    if (payload.resourceId !== expected.resourceId) {
      return { valid: false as const, reason: 'resource_mismatch' };
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false as const, reason: 'expired' };
    }

    return { valid: true as const, userId: payload.sub, payload };
  }

  validateAccessToken(
    token: string,
    expected: { userId: string; resourceType: ContentResourceType; resourceId: string },
  ) {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) {
      return { valid: false, reason: 'malformed_token' };
    }

    const expectedSignature = this.sign(encoded);
    const provided = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      provided.length !== expectedBuffer.length ||
      !timingSafeEqual(provided, expectedBuffer)
    ) {
      return { valid: false, reason: 'invalid_signature' };
    }

    let payload: ContentAccessPayload;
    try {
      payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ContentAccessPayload;
    } catch {
      return { valid: false, reason: 'invalid_payload' };
    }

    if (payload.sub !== expected.userId) {
      return { valid: false, reason: 'user_mismatch' };
    }
    if (payload.resourceType !== expected.resourceType) {
      return { valid: false, reason: 'resource_type_mismatch' };
    }
    if (payload.resourceId !== expected.resourceId) {
      return { valid: false, reason: 'resource_mismatch' };
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, reason: 'expired' };
    }

    return { valid: true, payload };
  }

  private sign(value: string) {
    const secret =
      this.configService.get<string>('CONTENT_ACCESS_SECRET') ??
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'dev-content-access-secret';
    return createHmac('sha256', secret).update(value).digest('base64url');
  }
}
