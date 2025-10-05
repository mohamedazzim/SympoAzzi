export function generateRegistrationApprovedEmail(
  name: string,
  eventName: string,
  username: string,
  password: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Approved - ${eventName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <!-- Header with gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">BootFeet 2K26</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Symposium Management Platform</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #166534; font-weight: 600; font-size: 16px;">✓ Registration Approved</p>
                    </div>
                    
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Hello ${name}!</h2>
                    
                    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Congratulations! Your registration for <strong>${eventName}</strong> has been approved.
                    </p>
                    
                    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Below are your login credentials to access the event platform:
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Username</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 16px; font-family: monospace;">${username}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px;">
                          <span style="color: #6b7280; font-size: 14px;">Password</span>
                        </td>
                        <td style="padding: 16px 20px; text-align: right;">
                          <strong style="color: #111827; font-size: 16px; font-family: monospace;">${password}</strong>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.APP_URL || 'https://symposium.replit.app'}/login" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        Login to Platform
                      </a>
                    </div>
                    
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 24px; border-radius: 4px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                        <strong>Important:</strong> Please keep your credentials secure. Do not share them with anyone.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center;">
                      Need help? Contact our support team
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2026 BootFeet. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function generateCredentialsEmail(
  name: string,
  eventName: string,
  username: string,
  password: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Credentials - ${eventName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">BootFeet 2K26</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Symposium Management Platform</p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 16px;">🔑 Your Event Credentials</p>
                    </div>
                    
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Welcome ${name}!</h2>
                    
                    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Your registration for <strong>${eventName}</strong> has been successfully completed.
                    </p>
                    
                    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Use these credentials to access the event platform:
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Username</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 16px; font-family: monospace;">${username}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px;">
                          <span style="color: #6b7280; font-size: 14px;">Password</span>
                        </td>
                        <td style="padding: 16px 20px; text-align: right;">
                          <strong style="color: #111827; font-size: 16px; font-family: monospace;">${password}</strong>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.APP_URL || 'https://symposium.replit.app'}/login" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        Access Platform
                      </a>
                    </div>
                    
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 24px; border-radius: 4px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                        <strong>Security Tip:</strong> Keep your credentials confidential and do not share them with anyone.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center;">
                      Questions? Contact our support team
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2026 BootFeet. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function generateTestStartReminderEmail(
  name: string,
  eventName: string,
  roundName: string,
  startTime: Date
): string {
  const formattedTime = startTime.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short'
  });
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Starting Soon - ${roundName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">BootFeet 2K26</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Symposium Management Platform</p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 16px;">⏰ Test Reminder</p>
                    </div>
                    
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Hi ${name}!</h2>
                    
                    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      This is a reminder that <strong>${roundName}</strong> for <strong>${eventName}</strong> is starting soon.
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Event</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 16px;">${eventName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Round</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 16px;">${roundName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px;">
                          <span style="color: #6b7280; font-size: 14px;">Start Time</span>
                        </td>
                        <td style="padding: 16px 20px; text-align: right;">
                          <strong style="color: #111827; font-size: 16px;">${formattedTime}</strong>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.APP_URL || 'https://symposium.replit.app'}/participant/my-tests" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        Go to Dashboard
                      </a>
                    </div>
                    
                    <div style="background: #e0e7ff; border-left: 4px solid #6366f1; padding: 16px; margin-top: 24px; border-radius: 4px;">
                      <p style="margin: 0; color: #3730a3; font-size: 14px; line-height: 1.5;">
                        <strong>Preparation Tips:</strong> Ensure you have a stable internet connection and your device is fully charged.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center;">
                      Good luck! You've got this! 🚀
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2026 BootFeet. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function generateResultPublishedEmail(
  name: string,
  eventName: string,
  score: number,
  rank: number
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Results Published - ${eventName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">BootFeet 2K26</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Symposium Management Platform</p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 16px;">📊 Results Published</p>
                    </div>
                    
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px;">Congratulations ${name}!</h2>
                    
                    <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Your results for <strong>${eventName}</strong> are now available.
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Event</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 16px;">${eventName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Your Score</span>
                        </td>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 24px;">${score}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 20px;">
                          <span style="color: #6b7280; font-size: 14px;">Your Rank</span>
                        </td>
                        <td style="padding: 16px 20px; text-align: right;">
                          <strong style="color: #111827; font-size: 24px;">#${rank}</strong>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${process.env.APP_URL || 'https://symposium.replit.app'}/participant/test-results" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        View Full Results
                      </a>
                    </div>
                    
                    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-top: 24px; border-radius: 4px;">
                      <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                        <strong>Well Done!</strong> Thank you for participating. Keep up the great work!
                      </p>
                    </div>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center;">
                      Thank you for participating! 🎉
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2026 BootFeet. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function generateAdminNotificationEmail(
  emailType: string,
  recipientEmail: string,
  recipientName: string,
  eventName: string,
  additionalDetails: Record<string, any>
): string {
  const timestamp = new Date().toLocaleString();
  const detailsHtml = Object.entries(additionalDetails)
    .map(([key, value]) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280; font-size: 14px;">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          <strong style="color: #111827; font-size: 14px;">${String(value)}</strong>
        </td>
      </tr>
    `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Activity Notification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">📧 Email Activity Alert</h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Super Admin Notification</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px;">
                    <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                      <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 16px;">Email Sent: ${emailType}</p>
                    </div>
                    
                    <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px;">Email Details</h3>
                    
                    <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Email Type</span>
                        </td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 14px;">${emailType}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Recipient Name</span>
                        </td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 14px;">${recipientName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Recipient Email</span>
                        </td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 14px; font-family: monospace;">${recipientEmail}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Event Name</span>
                        </td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 14px;">${eventName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px;">
                          <span style="color: #6b7280; font-size: 14px;">Sent At</span>
                        </td>
                        <td style="padding: 12px 16px; text-align: right;">
                          <strong style="color: #111827; font-size: 14px;">${timestamp}</strong>
                        </td>
                      </tr>
                    </table>
                    
                    ${Object.keys(additionalDetails).length > 0 ? `
                      <h3 style="margin: 24px 0 16px; color: #111827; font-size: 18px;">Additional Information</h3>
                      <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">
                        ${detailsHtml}
                      </table>
                    ` : ''}
                    
                    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-top: 24px; border-radius: 4px;">
                      <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                        <strong>✓ Email sent successfully</strong> - This is an automated notification for email tracking purposes.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 20px; background: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2026 BootFeet. All rights reserved. | Super Admin Dashboard
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
