import { IsNotEmpty, IsString } from 'class-validator';

export class InitiateEbookCheckoutDto {
  @IsString()
  @IsNotEmpty()
  ebookId!: string;
}
