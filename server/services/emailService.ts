import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { storage } from '../storage';
import {
  generateRegistrationApprovedEmail,
  generateCredentialsEmail,
  generateTestStartReminderEmail,
  generateResultPublishedEmail
} from '../templates/emailTemplates';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  metadata?: any;
}

class EmailService {
  private transporter: Transporter;
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
        pass: process.env.SMTP_PASS || 'ethereal.password'
      }
    });
  }
  
  private async sendWithRetry(
    mailOptions: any,
    maxRetries: number = 3,
    attempt: number = 1
  ): Promise<{ success: boolean; messageId?: string; error?: string; retryCount: number }> {
    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId, retryCount: attempt - 1 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const isRetryable = this.isRetryableError(error);
      
      if (isRetryable && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`Email send failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.sendWithRetry(mailOptions, maxRetries, attempt + 1);
      }
      
      return { success: false, error: errorMessage, retryCount: attempt - 1 };
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const errorString = String(error).toLowerCase();
    
    // Check for SMTP 4xx status codes (400-499 range)
    // These indicate temporary failures that should be retried
    const smtpCodeMatch = errorString.match(/\b(4\d\d)\b/);
    if (smtpCodeMatch) {
      const code = parseInt(smtpCodeMatch[1]);
      if (code >= 400 && code <= 499) {
        return true;
      }
    }
    
    // Check error object for responseCode or code properties
    if (error.responseCode) {
      const code = parseInt(String(error.responseCode));
      if (code >= 400 && code <= 499) {
        return true;
      }
    }
    
    if (error.code && typeof error.code === 'number') {
      if (error.code >= 400 && error.code <= 499) {
        return true;
      }
    }
    
    // Check for common transient error patterns
    const retryablePatterns = [
      'network',
      'timeout',
      'econnrefused',
      'econnreset',
      'etimedout',
      'temporary failure',
      'connection timeout',
      'socket hang up',
    ];
    
    return retryablePatterns.some(pattern => errorString.includes(pattern));
  }
  
  async sendEmail(
    options: EmailOptions,
    templateType: string,
    recipientName?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"BootFeet 2K26" <noreply@bootfeet.com>',
      to: options.to,
      subject: options.subject,
      html: options.html
    };
    
    const result = await this.sendWithRetry(mailOptions);
    
    const metadata = {
      ...(options.metadata || {}),
      retryCount: result.retryCount
    };
    
    await storage.createEmailLog({
      recipientEmail: options.to,
      recipientName: recipientName || null,
      subject: options.subject,
      templateType,
      status: result.success ? 'sent' : 'failed',
      metadata,
      errorMessage: result.error || null
    });
    
    if (result.success) {
      console.log(`Email sent successfully to ${options.to} (${templateType})`);
    } else {
      console.error(`Email send failed to ${options.to}:`, result.error);
    }
    
    return result;
  }
  
  async sendRegistrationApproved(
    to: string,
    name: string,
    eventName: string,
    username: string,
    password: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = generateRegistrationApprovedEmail(name, eventName, username, password);
    return this.sendEmail(
      {
        to,
        subject: `Registration Approved - ${eventName}`,
        html,
        metadata: { eventName, username }
      },
      'registration_approved',
      name
    );
  }
  
  async sendCredentials(
    to: string,
    name: string,
    eventName: string,
    username: string,
    password: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = generateCredentialsEmail(name, eventName, username, password);
    return this.sendEmail(
      {
        to,
        subject: `Your Credentials for ${eventName}`,
        html,
        metadata: { eventName, username }
      },
      'credentials_distribution',
      name
    );
  }
  
  async sendTestStartReminder(
    to: string,
    name: string,
    eventName: string,
    roundName: string,
    startTime: Date
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = generateTestStartReminderEmail(name, eventName, roundName, startTime);
    return this.sendEmail(
      {
        to,
        subject: `Test Starting Soon - ${roundName}`,
        html,
        metadata: { eventName, roundName, startTime: startTime.toISOString() }
      },
      'test_start_reminder',
      name
    );
  }
  
  async sendResultPublished(
    to: string,
    name: string,
    eventName: string,
    score: number,
    rank: number
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = generateResultPublishedEmail(name, eventName, score, rank);
    return this.sendEmail(
      {
        to,
        subject: `Results Published - ${eventName}`,
        html,
        metadata: { eventName, score, rank }
      },
      'result_published',
      name
    );
  }
}

export const emailService = new EmailService();
