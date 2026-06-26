import { Module } from '@nestjs/common';
import { ClipsController } from './clips.controller';
import { ClipsService } from './clips.service';
import { ClipsUploadService } from './clips-upload.service';

@Module({
  controllers: [ClipsController],
  providers: [ClipsService, ClipsUploadService],
  exports: [ClipsService],
})
export class ClipsModule {}
