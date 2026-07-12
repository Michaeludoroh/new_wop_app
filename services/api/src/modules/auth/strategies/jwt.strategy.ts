import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppRole, AuthUserPayload } from '../auth.types';
import { readJwtAccessSecret } from '../jwt-config.util';
import { normalizeAppRole } from '../role.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtAccessSecret = readJwtAccessSecret(configService);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtAccessSecret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AuthUserPayload) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[jwt.strategy.validate] payload', {
        sub: payload?.sub,
        role: payload?.role,
      });
    }

    const subject = typeof payload?.sub === 'string' ? payload.sub.trim() : '';
    const tokenRole = normalizeAppRole(payload?.role);

    if (!subject || !tokenRole) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: subject },
      select: {
        id: true,
        email: true,
        role: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User is no longer active');
    }

    const currentRole = normalizeAppRole(user.role);
    if (!currentRole || currentRole !== tokenRole) {
      throw new UnauthorizedException('Token role is no longer current');
    }

    return {
      sub: user.id,
      email: user.email,
      role: currentRole as AppRole,
    };
  }
}
