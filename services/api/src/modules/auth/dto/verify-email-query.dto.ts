import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailQueryDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
