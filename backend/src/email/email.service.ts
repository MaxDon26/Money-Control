import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private appUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      'Money Control <onboarding@resend.dev>';
    this.appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
  }

  async sendPasswordReset(email: string, token: string): Promise<boolean> {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Сброс пароля — Money Control',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1890ff;">Сброс пароля</h2>
            <p>Вы запросили сброс пароля для вашего аккаунта Money Control.</p>
            <p>Нажмите на кнопку ниже, чтобы установить новый пароль:</p>
            <p style="margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #1890ff; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 4px; display: inline-block;">
                Сбросить пароль
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Ссылка действительна в течение 1 часа.
            </p>
            <p style="color: #666; font-size: 14px;">
              Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Money Control — Контроль доходов и расходов
            </p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      return false;
    }
  }

  async sendEmailVerification(email: string, token: string): Promise<boolean> {
    const verifyUrl = `${this.appUrl}/verify-email/${token}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Подтверждение email — Money Control',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1890ff;">Подтверждение email</h2>
            <p>Спасибо за регистрацию в Money Control!</p>
            <p>Нажмите на кнопку ниже, чтобы подтвердить ваш email:</p>
            <p style="margin: 30px 0;">
              <a href="${verifyUrl}"
                 style="background-color: #52c41a; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 4px; display: inline-block;">
                Подтвердить email
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Ссылка действительна в течение 24 часов.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Money Control — Контроль доходов и расходов
            </p>
          </div>
        `,
      });
      this.logger.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      return false;
    }
  }
}
