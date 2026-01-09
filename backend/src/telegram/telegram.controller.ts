import { Controller, Post, Get, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TelegramService } from './telegram.service';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('telegram')
@Controller('telegram')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TelegramController {
  constructor(private telegramService: TelegramService) {}

  @Post('link-code')
  @ApiOperation({ summary: 'Generate a code to link Telegram account' })
  async generateLinkCode(@Req() req: AuthenticatedRequest) {
    const code = await this.telegramService.generateLinkCode(req.user.id);
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
  async getLinkStatus(@Req() req: AuthenticatedRequest) {
    return this.telegramService.getLinkStatus(req.user.id);
  }

  @Delete('unlink')
  @ApiOperation({ summary: 'Unlink Telegram account' })
  async unlinkTelegram(@Req() req: AuthenticatedRequest) {
    const success = await this.telegramService.unlinkTelegram(req.user.id);
    return { success };
  }
}
