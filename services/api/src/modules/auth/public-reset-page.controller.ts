import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { renderPublicResetPasswordPage } from './public-reset-page.util';

@Controller()
export class PublicUserResetPageController {
  constructor(private readonly configService: ConfigService) {}

  @Get('reset-password')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @Header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'",
  )
  render(): string {
    return renderPublicResetPasswordPage({
      USER_WEB_APP_URL: this.configService.get<string>('USER_WEB_APP_URL'),
      PUBLIC_WEB_APP_URL: this.configService.get<string>('PUBLIC_WEB_APP_URL'),
      API_PUBLIC_URL: this.configService.get<string>('API_PUBLIC_URL'),
      APP_NAME: this.configService.get<string>('APP_NAME'),
    });
  }
}
