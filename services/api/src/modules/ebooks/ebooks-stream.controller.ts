import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { EbooksService } from './ebooks.service';

@Controller('ebooks')
export class EbooksStreamController {
  constructor(private readonly service: EbooksService) {}

  @Get(':id/stream')
  stream(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    return this.service.streamFile(id, token, res);
  }
}
