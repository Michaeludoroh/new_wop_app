import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { SubmitContactDto } from './dto/submit-contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  submit(@Body() dto: SubmitContactDto) {
    return this.contactService.submitContactForm(dto);
  }
}
