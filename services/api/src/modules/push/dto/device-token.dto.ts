import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum PushPlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB',
}

export class RegisterDeviceTokenDto {
  @IsString()
  @MaxLength(1024)
  token!: string;

  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;
}

export class RefreshDeviceTokenDto {
  @IsString()
  @MaxLength(1024)
  oldToken!: string;

  @IsString()
  @MaxLength(1024)
  newToken!: string;

  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;
}

export class RevokeDeviceTokenDto {
  @IsString()
  @MaxLength(1024)
  token!: string;
}
