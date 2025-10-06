import '../config/resend.config';
import { Resend } from 'resend';
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
  private resend: Resend | null;
  private isDevelopmentMode: boolean;
  private fromEmail: string;
  
  constructor() {
    const resendApiKey = process.env.RESEND_API_KEY;
    this.isDevelopmentMode = !resendApiKey;
    
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.fromEmail = process.env.RESEND_FROM_EMAIL || 'BootFeet 2K26 <onboarding@resend.dev>';
      console.log('✅ Email service initialized with Resend:');
      console.log(`   API Key: ${resendApiKey.substring(0, 10)}...`);
      console.log(`   From: ${this.fromEmail}`);
    } else {
      this.resend = null;
      this.fromEmail = 'BootFeet 2K26 <noreply@bootfeet.com>';
      console.log('⚠️  Email service running in DEVELOPMENT MODE - emails will be logged, not sent');
      console.log('   Missing RESEND_API_KEY. Set this secret to enable email sending.');
    }
  }
  
  private categorizeError(error: any): string {
    const errorString = String(error).toLowerCase();
    const errorMessage = error instanceof Error ? error.message : '';
    
    if (errorString.includes('authentication') || errorString.includes('auth') || 
        errorString.includes('invalid') || errorString.includes('unauthorized')) {
      return 'AUTHENTICATION_FAILED';
    }
    
    if (errorString.includes('rate limit') || errorString.includes('too many')) {
      return 'RATE_LIMITED';
    }
    
    if (errorString.includes('timeout') || errorString.includes('etimedout')) {
      return 'TIMEOUT';
    }
    
    if (errorString.includes('network') || errorString.includes('econnrefused')) {
      return 'NETWORK_ERROR';
    }
    
    if (errorString.includes('validation') || errorString.includes('invalid email')) {
      return 'VALIDATION_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  private getErrorDetails(error: any, category: string): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    switch (category) {
      case 'AUTHENTICATION_FAILED':
        return `Resend authentication failed. Check RESEND_API_KEY. Error: ${errorMessage}`;
      case 'RATE_LIMITED':
        return `Rate limit exceeded. Please try again later. Error: ${errorMessage}`;
      case 'TIMEOUT':
        return `Request timed out. Check network connectivity. Error: ${errorMessage}`;
      case 'NETWORK_ERROR':
        return `Network error occurred: ${errorMessage}`;
      case 'VALIDATION_ERROR':
        return `Email validation error: ${errorMessage}`;
      default:
        return errorMessage;
    }
  }

  private async sendWithRetry(
    emailData: { from: string; to: string; subject: string; html: string },
    maxRetries: number = 3,
    attempt: number = 1
  ): Promise<{ success: boolean; messageId?: string; error?: string; retryCount: number; errorCategory?: string }> {
    if (this.isDevelopmentMode || !this.resend) {
      console.log('\n📧 [DEV MODE] Email would be sent:');
      console.log('   To:', emailData.to);
      console.log('   From:', emailData.from);
      console.log('   Subject:', emailData.subject);
      console.log('   (Email content logged to email_logs table)\n');
      return { 
        success: true, 
        messageId: `dev-mode-${Date.now()}`, 
        retryCount: 0 
      };
    }
    
    try {
      console.log(`📤 Attempting to send email to ${emailData.to} (attempt ${attempt}/${maxRetries})`);
      const result = await this.resend.emails.send(emailData);
      
      if (result.error) {
        throw new Error(result.error.message || 'Unknown Resend error');
      }
      
      console.log(`✅ Email sent successfully! Message ID: ${result.data?.id}`);
      return { success: true, messageId: result.data?.id, retryCount: attempt - 1 };
    } catch (error) {
      const errorCategory = this.categorizeError(error);
      const errorDetails = this.getErrorDetails(error, errorCategory);
      
      console.error(`❌ Email send failed (attempt ${attempt}/${maxRetries})`);
      console.error(`   Error Category: ${errorCategory}`);
      console.error(`   Error Details: ${errorDetails}`);
      
      const isRetryable = this.isRetryableError(error);
      
      if (isRetryable && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`   🔄 Error is retryable. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.sendWithRetry(emailData, maxRetries, attempt + 1);
      }
      
      console.error(`   ❌ Max retries reached or error is not retryable. Giving up.`);
      return { 
        success: false, 
        error: errorDetails, 
        retryCount: attempt - 1,
        errorCategory 
      };
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const errorString = String(error).toLowerCase();
    
    const retryablePatterns = [
      'network',
      'timeout',
      'econnrefused',
      'econnreset',
      'etimedout',
      'temporary failure',
      'connection timeout',
      'socket hang up',
      '5', 
    ];
    
    return retryablePatterns.some(pattern => errorString.includes(pattern));
  }
  
  async sendEmail(
    options: EmailOptions,
    templateType: string,
    recipientName?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const emailData = {
      from: this.fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html
    };
    
    const result = await this.sendWithRetry(emailData);
    
    const metadata = {
      ...(options.metadata || {}),
      retryCount: result.retryCount
    };
    
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

      const emailData = {
        from: this.fromEmail,
        to: superadmin.email,
        subject: `📧 Email Activity: ${emailType} sent to ${recipientName}`,
        html
      };

      if (this.isDevelopmentMode || !this.resend) {
        console.log('\n📧 [DEV MODE] Admin notification would be sent:');
        console.log('   To:', superadmin.email);
        console.log('   Subject:', emailData.subject);
      } else {
        const result = await this.resend.emails.send(emailData);
        if (!result.error) {
          console.log(`✅ Admin notification sent to ${superadmin.email}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

export const emailService = new EmailService();
