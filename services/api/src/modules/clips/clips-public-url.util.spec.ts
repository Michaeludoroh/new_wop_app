import { resolveApiPublicOrigin, toPublicAssetUrl } from './clips-public-url.util';

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

  it('leaves already-public CDN URLs unchanged', () => {
    expect(toPublicAssetUrl('https://cdn.example.com/clips/faith.mp4', env)).toBe(
      'https://cdn.example.com/clips/faith.mp4',
    );
  });
});
