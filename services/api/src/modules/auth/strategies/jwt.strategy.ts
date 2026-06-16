import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppRole } from '../auth.types';

type JwtPayload = {
  sub: string;
  email: string;
  role: AppRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtAccessSecret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!jwtAccessSecret) {
      throw new UnauthorizedException('JWT_ACCESS_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtAccessSecret,
    });
  }

  async validate(payload: JwtPayload) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[jwt.strategy.validate] payload', {
        sub: payload?.sub,
        role: payload?.role,
      });
    }

    if (!payload?.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (!Object.values(Role).includes(payload.role as Role)) {
      throw new UnauthorizedException('Invalid token role');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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

    if (user.role !== payload.role) {
      throw new UnauthorizedException('Token role is no longer current');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role as AppRole,
    };
  }
}
