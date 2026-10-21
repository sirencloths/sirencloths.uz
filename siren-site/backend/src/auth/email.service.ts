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
      throw new ServiceUnavailableException('Email delivery is temporarily unavailable. Please try again later.');
    }
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const transport = nodemailer.createTransport({
      host, port, secure: port === 465, auth: { user, pass },
      connectionTimeout: 4_000, greetingTimeout: 4_000, socketTimeout: 4_000,
    });
    let deliveryTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const sendMail = transport.sendMail({
        from: this.config.get<string>('EMAIL_FROM') ?? 'PREVAILEN <sirencloths@gmail.com>',
        to: email,
        subject: 'Your PREVAILEN verification code',
        text: `PREVAILEN\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`,
        html: `<main style="font-family:Arial,sans-serif;color:#111"><h1 style="letter-spacing:.08em">PREVAILEN</h1><p>Your verification code is:</p><p style="font-size:30px;font-weight:800;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes.</p><p>If you did not request this, you can ignore this email.</p></main>`,
      });
      // Nodemailer can remain pending when a network device silently drops
      // SMTP traffic. A hard deadline guarantees the registration UI receives
      // a useful response instead of waiting forever.
      await Promise.race([
        sendMail,
        new Promise<never>((_, reject) => {
          deliveryTimeout = setTimeout(() => reject(new Error('SMTP delivery timeout')), 4_000);
        }),
      ]);
    } catch {
      throw new ServiceUnavailableException('Email delivery is temporarily unavailable. Please try again later.');
    } finally {
      if (deliveryTimeout) clearTimeout(deliveryTimeout);
      transport.close();
    }
  }
}
