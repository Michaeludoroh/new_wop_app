import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const NotificationChannelValues = ['IN_APP', 'EMAIL', 'PUSH'] as const;
type NotificationChannelValue = (typeof NotificationChannelValues)[number];

export class CreateTargetedNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body!: string;

  @IsEnum(NotificationChannelValues)
  channel!: NotificationChannelValue;

  @Matches(/^[a-z0-9]{25,}$/i, {
    message: 'userId must be a valid user identifier',
  })
  userId!: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  route?: string;
}
