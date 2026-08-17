import {
  PUBLIC_RESET_PASSWORD_API_PATH,
  buildUserEmailVerificationUrl,
  buildUserLoginUrl,
  buildUserPasswordResetUrl,
  isAdminWebOrigin,
  resolveUserWebAppUrl,
} from './user-web-app-url.util';

describe('user web app URL helpers', () => {
  it('uses USER_WEB_APP_URL for the public user origin', () => {
    expect(
      resolveUserWebAppUrl({
        USER_WEB_APP_URL: 'https://woppandmopp.com',
        WEB_APP_URL: 'https://admin.woppandmopp.com',
      }),
    ).toBe('https://woppandmopp.com');
  });

  it('never uses the admin domain even when WEB_APP_URL is the only configured value', () => {
    expect(
      resolveUserWebAppUrl({
        WEB_APP_URL: 'https://admin.woppandmopp.com',
        MOBILE_WEB_URL: 'https://admin.woppandmopp.com',
      }),
    ).toBe('https://woppandmopp.com');
    expect(isAdminWebOrigin('https://admin.woppandmopp.com')).toBe(true);
  });

  it('rejects USER_WEB_APP_URL when it points at the admin host', () => {
    expect(
      resolveUserWebAppUrl({
        USER_WEB_APP_URL: 'https://admin.woppandmopp.com',
        API_PUBLIC_URL: 'https://woppandmopp.com/api/v1',
      }),
    ).toBe('https://woppandmopp.com');
  });

  it('builds a public reset URL that does not include the admin host', () => {
    const url = buildUserPasswordResetUrl('reset-token', {
      USER_WEB_APP_URL: 'https://woppandmopp.com',
      WEB_APP_URL: 'https://admin.woppandmopp.com',
    });

    expect(url).toBe('https://woppandmopp.com/reset-password?token=reset-token');
    expect(url).not.toContain('admin.woppandmopp.com');
    expect(PUBLIC_RESET_PASSWORD_API_PATH).toBe('/api/v1/auth/reset-password');
  });

  it('builds the public user login URL rather than admin login', () => {
    expect(
      buildUserLoginUrl({
        USER_WEB_APP_URL: 'https://woppandmopp.com',
        WEB_APP_URL: 'https://admin.woppandmopp.com',
      }),
    ).toBe('https://woppandmopp.com/login');
  });

  it('builds a public email verification URL that does not include the admin host', () => {
    const url = buildUserEmailVerificationUrl('verify-token', {
      USER_WEB_APP_URL: 'https://woppandmopp.com',
      WEB_APP_URL: 'https://admin.woppandmopp.com',
    });

    expect(url).toBe('https://woppandmopp.com/verify-email?token=verify-token');
    expect(url).not.toContain('admin.woppandmopp.com');
  });
});
