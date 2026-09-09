import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  async sendVerificationCode(email: string, code: string) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    if (!host || !user || !pass) {
      throw new ServiceUnavailableException('Email delivery is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD.');
    }
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transport.sendMail({
      from: this.config.get<string>('EMAIL_FROM') ?? 'SIREN <sirencloths@gmail.com>',
      to: email,
      subject: 'Your SIREN verification code',
      text: `SIREN\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `<main style="font-family:Arial,sans-serif;color:#111"><h1 style="letter-spacing:.08em">SIREN</h1><p>Your verification code is:</p><p style="font-size:30px;font-weight:800;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes.</p><p>If you did not request this, you can ignore this email.</p></main>`,
    });
  }
}
