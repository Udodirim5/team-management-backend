// utils/email.ts
import nodemailer, { Transporter } from 'nodemailer';
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

  private async newTransport(): Promise<Transporter> {
    if (getEnv('NODE_ENV') === 'production') {
      return nodemailer.createTransport({
        host: getEnv('EMAIL_HOST'),
        port: Number(getEnv('EMAIL_PORT')),
        secure: Number(getEnv('EMAIL_PORT')) === 465, // true if using SSL
        auth: {
          user: getEnv('EMAIL_USERNAME'),
          pass: getEnv('EMAIL_PASSWORD'),
        },
      });
    }

    // ETHEREAL fallback in dev
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
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

    const transporter = await this.newTransport();

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    const info = await transporter.sendMail(mailOptions);

    if (getEnv('NODE_ENV') !== 'production') {
      console.log(`📬 Email sent (preview): ${nodemailer.getTestMessageUrl(info)}`);
    }
  }

  async sendWelcome() {
    await this.send('Welcome to Team Manager!', "We're thrilled to have you on board.");
  }

  async sendPasswordReset() {
    await this.send(
      'Password Reset Token',
      `Click the link below to reset your password. Valid for 10 mins.`,
    );
  }
}
