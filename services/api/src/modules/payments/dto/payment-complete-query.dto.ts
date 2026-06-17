import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentCompleteQueryDto {
  @IsString()
  @IsNotEmpty()
  tx_ref!: string;
}
