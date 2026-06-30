import { applyDecorators, UseGuards } from '@nestjs/common';
import { PremiumAccessGuard } from '../guards/premium-access.guard';

export function RequirePremium() {
  return applyDecorators(UseGuards(PremiumAccessGuard));
}
