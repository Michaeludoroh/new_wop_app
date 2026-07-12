import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyGooglePurchaseDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  purchaseToken!: string;

  @IsOptional()
  @IsString()
  packageName?: string;
}
