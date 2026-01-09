import { Controller, Post, Get, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { TelegramService } from './telegram.service';

@ApiTags('telegram')
@Controller('telegram')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TelegramController {
  constructor(private telegramService: TelegramService) {}

  @Post('link-code')
  @ApiOperation({ summary: 'Generate a code to link Telegram account' })
  async generateLinkCode(@CurrentUser('id') userId: string) {
    const code = await this.telegramService.generateLinkCode(userId);
    const botUsername = this.telegramService.getBotUsername();

    return {
      code,
      expiresIn: 900, // 15 minutes in seconds
      botUsername,
      botLink: botUsername ? `https://t.me/${botUsername}?start=${code}` : null,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Telegram link status' })
  async getLinkStatus(@CurrentUser('id') userId: string) {
    return this.telegramService.getLinkStatus(userId);
  }

  @Delete('unlink')
  @ApiOperation({ summary: 'Unlink Telegram account' })
  async unlinkTelegram(@CurrentUser('id') userId: string) {
    const success = await this.telegramService.unlinkTelegram(userId);
    return { success };
  }
}
