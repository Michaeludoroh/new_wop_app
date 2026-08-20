import { Module } from '@nestjs/common';
import { MentorshipController } from './mentorship.controller';
import { MentorshipService } from './mentorship.service';
import { MentorshipUploadService } from './mentorship-upload.service';

@Module({
  controllers: [MentorshipController],
  providers: [MentorshipService, MentorshipUploadService],
  exports: [MentorshipService],
})
export class MentorshipModule {}
