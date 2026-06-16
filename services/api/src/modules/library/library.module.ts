import { Module } from '@nestjs/common';
import { EbooksModule } from '../ebooks/ebooks.module';
import { LibraryController } from './library.controller';

@Module({
  imports: [EbooksModule],
  controllers: [LibraryController],
})
export class LibraryModule {}
