import { resolveApiPublicOrigin, toPublicAssetUrl } from './clips-public-url.util';
import { buildPublicUploadUrl } from '../../common/public-url.util';

describe('clips public URL helpers', () => {
  const env = { API_PUBLIC_URL: 'https://woppandmopp.com/api/v1' };

  it('strips a trailing /api/v1 prefix from API_PUBLIC_URL', () => {
    expect(resolveApiPublicOrigin(env)).toBe('https://woppandmopp.com');
  });

  it('rewrites localhost upload URLs to the public origin', () => {
    expect(toPublicAssetUrl('http://localhost:4000/api/v1/uploads/clips/media/a.mp4', env)).toBe(
      'https://woppandmopp.com/api/v1/uploads/clips/media/a.mp4',
    );
  });

  it('rewrites docker and emulator hosts and relative upload keys', () => {
    expect(
      toPublicAssetUrl('http://host.docker.internal:4000/api/v1/uploads/clips/media/a.mp4', env),
    ).toBe('https://woppandmopp.com/api/v1/uploads/clips/media/a.mp4');
    expect(toPublicAssetUrl('clips/media/a.mp4', env)).toBe(
      'https://woppandmopp.com/api/v1/uploads/clips/media/a.mp4',
    );
    expect(buildPublicUploadUrl('ebooks/cover/a.jpg', env)).toBe(
      'https://woppandmopp.com/api/v1/uploads/ebooks/cover/a.jpg',
    );
  });

  it('collapses duplicated /api/v1 prefixes', () => {
    expect(
      toPublicAssetUrl('https://woppandmopp.com/api/v1/api/v1/uploads/ebooks/cover/a.jpg', env),
    ).toBe('https://woppandmopp.com/api/v1/uploads/ebooks/cover/a.jpg');
  });

  it('leaves already-public CDN URLs unchanged', () => {
    expect(toPublicAssetUrl('https://cdn.example.com/clips/faith.mp4', env)).toBe(
      'https://cdn.example.com/clips/faith.mp4',
    );
  });
});
