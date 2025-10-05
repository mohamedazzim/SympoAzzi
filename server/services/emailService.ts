import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { storage } from '../storage';
import {
  generateRegistrationApprovedEmail,
  generateCredentialsEmail,
  generateTestStartReminderEmail,
  generateResultPublishedEmail,
  generateAdminNotificationEmail
} from '../templates/emailTemplates';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  metadata?: any;
}

class EmailService {
  private transporter: Transporter | null;
  private isDevelopmentMode: boolean;
  
  constructor() {
    // Check if SMTP credentials are configured
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    this.isDevelopmentMode = !hasSmtpConfig;
    
    if (hasSmtpConfig) {
      // Production mode: use real SMTP
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      console.log('✅ Email service initialized with SMTP configuration');
    } else {
      // Development mode: log emails instead of sending
      this.transporter = null;
      console.log('⚠️  Email service running in DEVELOPMENT MODE - emails will be logged, not sent');
      console.log('   To enable email sending, configure SMTP secrets: SMTP_HOST, SMTP_USER, SMTP_PASS');
    }
  }
  
  private async sendWithRetry(
    mailOptions: any,
    maxRetries: number = 3,
    attempt: number = 1
  ): Promise<{ success: boolean; messageId?: string; error?: string; retryCount: number }> {
    // Development mode: log email instead of sending
    if (this.isDevelopmentMode || !this.transporter) {
      console.log('\n📧 [DEV MODE] Email would be sent:');
      console.log('   To:', mailOptions.to);
      console.log('   From:', mailOptions.from);
      console.log('   Subject:', mailOptions.subject);
      console.log('   (Email content logged to email_logs table)\n');
      return { 
        success: true, 
        messageId: `dev-mode-${Date.now()}`, 
        retryCount: 0 
      };
    }
    
    // Production mode: actually send email
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
    
    // Log email to database (non-blocking - don't fail email sending if logging fails)
    try {
      await storage.createEmailLog({
        recipientEmail: options.to,
        recipientName: recipientName || null,
        subject: options.subject,
        templateType,
        status: result.success ? 'sent' : 'failed',
        metadata,
        errorMessage: result.error || null
      });
    } catch (logError) {
      console.warn('⚠️  Failed to log email to database:', logError instanceof Error ? logError.message : 'Unknown error');
    }
    
    if (result.success) {
      if (this.isDevelopmentMode) {
        console.log(`✅ [DEV MODE] Email logged successfully: ${templateType} to ${options.to}`);
      } else {
        console.log(`✅ Email sent successfully to ${options.to} (${templateType})`);
      }
      
      // Notify superadmin about email activity (non-blocking)
      const eventName = options.metadata?.eventName || 'N/A';
      this.notifySuperAdmin(
        templateType,
        options.to,
        recipientName || 'Unknown',
        eventName,
        options.metadata || {}
      ).catch(err => {
        console.error('Failed to notify superadmin:', err);
      });
    } else {
      console.error(`❌ Email send failed to ${options.to}:`, result.error);
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

  private async notifySuperAdmin(
    emailType: string,
    recipientEmail: string,
    recipientName: string,
    eventName: string,
    additionalDetails: Record<string, any>
  ): Promise<void> {
    try {
      // Get superadmin email
      const superadmins = await storage.getUsers();
      const superadmin = superadmins.find(u => u.role === 'super_admin');
      
      if (!superadmin || !superadmin.email) {
        console.warn('⚠️  No superadmin found to notify about email activity');
        return;
      }

      const html = generateAdminNotificationEmail(
        emailType,
        recipientEmail,
        recipientName,
        eventName,
        additionalDetails
      );

      const mailOptions = {
        from: process.env.SMTP_FROM || '"BootFeet 2K26" <noreply@bootfeet.com>',
        to: superadmin.email,
        subject: `📧 Email Activity: ${emailType} sent to ${recipientName}`,
        html
      };

      // Send notification (don't use retry to avoid recursive notifications)
      if (this.isDevelopmentMode || !this.transporter) {
        console.log('\n📧 [DEV MODE] Admin notification would be sent:');
        console.log('   To:', superadmin.email);
        console.log('   Subject:', mailOptions.subject);
      } else {
        await this.transporter.sendMail(mailOptions);
        console.log(`✅ Admin notification sent to ${superadmin.email}`);
      }
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

export const emailService = new EmailService();
