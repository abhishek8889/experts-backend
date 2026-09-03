import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async sendVerificationOtp(email: string, otp: string) {
    const host = this.configService.get<string>('MAIL_HOST');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('MAIL_USER');
    const appName =
      this.configService.get<string>('APP_NAME') ?? 'experts-backend';

    if (!host || !user || !pass || !from) {
      throw new InternalServerErrorException('auth.EMAIL_SEND_FAILED');
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.configService.get('MAIL_PORT') ?? 587),
      secure: Number(this.configService.get('MAIL_PORT') ?? 587) === 465,
      auth: { user, pass },
    });

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: `${appName} email verification`,
        text: `Your verification code is ${otp}. It expires in ${this.configService.get('OTP_EXPIRES_MINUTES') ?? 10} minutes.`,
        html: `<p>Your verification code is <strong>${otp}</strong>.</p><p>It expires in ${this.configService.get('OTP_EXPIRES_MINUTES') ?? 10} minutes.</p>`,
      });
    } catch {
      throw new InternalServerErrorException('auth.EMAIL_SEND_FAILED');
    }
  }
}
