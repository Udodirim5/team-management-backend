// utils/email.ts
import nodemailer from 'nodemailer';
import { htmlToText } from 'html-to-text';
import getEnv from '../config/env';

interface User {
  email: string;
  name: string;
}

export default class EmailService {
  private to: string;
  private firstName: string;
  private url: string;
  private from: string;

  constructor(user: User, url: string) {
    this.to = user.email;
    this.firstName = user.name ? (user.name.split(' ')[0] ?? '') : '';
    this.url = url;
    this.from = `Team Manager <${getEnv('EMAIL_FROM')}>`;
  }

  private newTransport() {
    return nodemailer.createTransport({
      host: getEnv('EMAIL_HOST'),
      port: Number(getEnv('EMAIL_PORT')),
      auth: {
        user: getEnv('EMAIL_USERNAME'),
        pass: getEnv('EMAIL_PASSWORD'),
      },
    });
  }

  private async send(subject: string, message: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>${subject}</h2>
        <p>Hi ${this.firstName || 'there'},</p>
        <p>${message}</p>
        ${this.url ? `<p><a href="${this.url}" style="color: #1a73e8;">Click here</a> to proceed.</p>` : ''}
        <p>If you didn’t request this, you can ignore this email.</p>
      </div>
    `;

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send(
      'Welcome to Team Manager!',
      `We're thrilled to have you on board. Click below to get started.`,
    );
  }

  async sendPasswordReset() {
    await this.send(
      'Password Reset Token',
      `You requested a password reset. Use the link below to set a new password. This token is valid for only 10 minutes.`,
    );
  }
}
