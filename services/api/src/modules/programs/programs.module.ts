import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { ProgramsUploadService } from './programs-upload.service';

@Module({
  controllers: [ProgramsController],
  providers: [ProgramsService, ProgramsUploadService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
