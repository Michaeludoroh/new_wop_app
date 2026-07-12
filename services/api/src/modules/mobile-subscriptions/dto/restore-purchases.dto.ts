import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MobilePlatform } from '@prisma/client';

export class RestorePurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsOptional()
  @IsString()
  purchaseToken?: string;

  @IsOptional()
  @IsString()
  receiptData?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class RestorePurchasesDto {
  @IsEnum(MobilePlatform)
  platform!: MobilePlatform;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RestorePurchaseItemDto)
  purchases!: RestorePurchaseItemDto[];
}
