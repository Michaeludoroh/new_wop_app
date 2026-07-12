import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyApplePurchaseDto {
  @IsString()
  @IsNotEmpty()
  receiptData!: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}
