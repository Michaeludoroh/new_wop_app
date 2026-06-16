import { IsString } from 'class-validator';

export class AcceptPolicyDto {
  @IsString()
  policyId!: string;
}
