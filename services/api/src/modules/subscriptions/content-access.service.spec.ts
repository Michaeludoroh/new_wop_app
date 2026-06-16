import { ConfigService } from '@nestjs/config';
import { ContentAccessService } from './content-access.service';

describe('ContentAccessService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'CONTENT_ACCESS_SECRET') return 'test-content-secret';
      return undefined;
    }),
  } as unknown as ConfigService;

  const service = new ContentAccessService(config);

  it('issues and validates signed content access tokens', () => {
    const issued = service.issueAccessToken('user_1', 'ebook', 'ebook_1', 900);
    const result = service.validateAccessToken(issued.accessToken, {
      userId: 'user_1',
      resourceType: 'ebook',
      resourceId: 'ebook_1',
    });

    expect(result.valid).toBe(true);
  });

  it('rejects tokens for a different resource', () => {
    const issued = service.issueAccessToken('user_1', 'ebook', 'ebook_1', 900);
    const result = service.validateAccessToken(issued.accessToken, {
      userId: 'user_1',
      resourceType: 'ebook',
      resourceId: 'other_ebook',
    });

    expect(result.valid).toBe(false);
  });

  it('validates resource access tokens without requiring user id', () => {
    const issued = service.issueAccessToken('user_1', 'ebook', 'ebook_1', 900);
    const result = service.validateResourceAccessToken(issued.accessToken, {
      resourceType: 'ebook',
      resourceId: 'ebook_1',
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.userId).toBe('user_1');
    }
  });
});
