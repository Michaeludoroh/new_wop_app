import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentStatusQueryDto {
  @IsString()
  @IsNotEmpty()
  providerReference!: string;
}
