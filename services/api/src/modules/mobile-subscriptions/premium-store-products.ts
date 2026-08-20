import { ConfigService } from '@nestjs/config';

export const DEFAULT_PREMIUM_STORE_PRODUCT_IDS = [
  'wopp_premium_monthly',
  'wopp_premium_quarterly',
  'wopp_premium_yearly',
] as const;

export function getAllowedPremiumProductIds(configService: ConfigService): string[] {
  const configured = [
    configService.get<string>('MOBILE_IOS_PREMIUM_PRODUCT_ID'),
    configService.get<string>('MOBILE_ANDROID_PREMIUM_PRODUCT_ID'),
    configService.get<string>('MOBILE_IOS_PREMIUM_QUARTERLY_PRODUCT_ID'),
    configService.get<string>('MOBILE_ANDROID_PREMIUM_QUARTERLY_PRODUCT_ID'),
    configService.get<string>('MOBILE_IOS_PREMIUM_YEARLY_PRODUCT_ID'),
    configService.get<string>('MOBILE_ANDROID_PREMIUM_YEARLY_PRODUCT_ID'),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set([...DEFAULT_PREMIUM_STORE_PRODUCT_IDS, ...configured])];
}

export function isAllowedPremiumProductId(
  configService: ConfigService,
  productId: string | undefined,
): boolean {
  if (!productId?.trim()) {
    return false;
  }
  return getAllowedPremiumProductIds(configService).includes(productId.trim());
}
