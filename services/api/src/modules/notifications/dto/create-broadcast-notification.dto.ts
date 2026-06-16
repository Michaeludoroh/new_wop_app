import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const NotificationChannelValues = ['IN_APP', 'EMAIL', 'PUSH'] as const;
type NotificationChannelValue = (typeof NotificationChannelValues)[number];

export class CreateBroadcastNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body!: string;

  @IsIn(NotificationChannelValues)
  channel!: NotificationChannelValue;

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
