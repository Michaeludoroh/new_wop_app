import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PublicUserResetPageController } from './public-reset-page.controller';
import { renderPublicResetPasswordPage } from './public-reset-page.util';

describe('public user reset page', () => {
  const env = {
    USER_WEB_APP_URL: 'https://woppandmopp.com',
    WEB_APP_URL: 'https://admin.woppandmopp.com',
    APP_NAME: 'WOPP',
  };

  it('is not wrapped in auth guards', () => {
    const classGuards = Reflect.getMetadata(GUARDS_METADATA, PublicUserResetPageController) ?? [];
    const methodGuards =
      Reflect.getMetadata(GUARDS_METADATA, PublicUserResetPageController.prototype.render) ?? [];

    expect(classGuards).toEqual([]);
    expect(methodGuards).toEqual([]);
  });

  it('reads the token from the query string into the reset form', () => {
    const html = renderPublicResetPasswordPage(env);

    expect(html).toContain('id="reset-token"');
    expect(html).toContain("params.get('token')");
    expect(html).toContain('tokenInput.value = token');
  });

  it('posts to the public v1 API and redirects to the public user login', () => {
    const html = renderPublicResetPasswordPage(env);

    expect(html).toContain('/api/v1/auth/reset-password');
    expect(html).toContain('https://woppandmopp.com/login');
    expect(html).toContain('data-audience="normal-user"');
    expect(html).toContain('Password must be at least 8 characters.');
    expect(html).toContain('id="confirm-password"');
    expect(html).not.toContain('admin.woppandmopp.com');
    expect(html).not.toContain('/admin');
    expect(html.toLowerCase()).not.toContain('console.log');
    expect(html.toLowerCase()).not.toContain('console.debug');
  });
});
