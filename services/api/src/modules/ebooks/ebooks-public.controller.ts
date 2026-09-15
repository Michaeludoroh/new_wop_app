import { Controller, Get, Param, Query } from '@nestjs/common';
import { EbookQueryDto } from './dto/ebook-query.dto';
import { EbooksService } from './ebooks.service';

@Controller('ebooks/public')
export class EbooksPublicController {
  constructor(private readonly service: EbooksService) {}

  @Get()
  findAll(@Query() query: EbookQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
