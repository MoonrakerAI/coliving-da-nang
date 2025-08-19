import { Resend } from 'resend';
import { Communication, CommunicationType, CommunicationStatus, CommunicationDirection, CommunicationSource, CommunicationPriority } from '@/lib/db/models/communication';
import { CommunicationOperations } from '@/lib/db/operations/communications';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailConfig {
  from: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailIntegration {
  private static readonly DEFAULT_FROM = 'noreply@colivingdanang.com';

  static async sendEmail(
    to: string | string[],
    template: EmailTemplate,
    config: Partial<EmailConfig> = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const emailConfig = {
        from: config.from || this.DEFAULT_FROM,
        to: Array.isArray(to) ? to : [to],
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: config.replyTo,
        cc: config.cc,
        bcc: config.bcc
      };

      const result = await resend.emails.send(emailConfig);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Email sending error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  }

  static async sendCommunicationEmail(
    communication: Communication,
    tenantEmail: string,
    config: Partial<EmailConfig> = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.createEmailTemplate(communication);
    const result = await this.sendEmail(tenantEmail, template, config);

    // Log the email as a communication if successful
    if (result.success) {
      try {
        await CommunicationOperations.create({
          tenantId: communication.tenantId,
          propertyId: communication.propertyId,
          type: CommunicationType.EMAIL,
          subject: `Email: ${communication.subject}`,
          content: `Email sent successfully to ${tenantEmail}\n\nOriginal message:\n${communication.content}`,
          timestamp: new Date(),
          priority: communication.priority,
          status: CommunicationStatus.CLOSED,
          createdBy: communication.createdBy,
          tags: [...communication.tags, 'email-sent'],
          attachments: [],
          direction: CommunicationDirection.OUTGOING,
          source: CommunicationSource.MANUAL
        });
      } catch (error) {
        console.error('Failed to log email communication:', error);
      }
    }

    return result;
  }

  static createEmailTemplate(communication: Communication): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${communication.subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: white;
              padding: 30px 20px;
              border: 1px solid #e1e5e9;
              border-top: none;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              border: 1px solid #e1e5e9;
              border-top: none;
              border-radius: 0 0 8px 8px;
              text-align: center;
              font-size: 14px;
              color: #6c757d;
            }
            .priority-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .priority-high { background: #fee; color: #c53030; }
            .priority-medium { background: #fffbeb; color: #d69e2e; }
            .priority-low { background: #f0fff4; color: #38a169; }
            .priority-urgent { background: #fed7d7; color: #e53e3e; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">${communication.subject}</h1>
            <div style="margin-top: 10px;">
              <span class="priority-badge priority-${communication.priority.toLowerCase()}">
                ${communication.priority} Priority
              </span>
            </div>
          </div>
          
          <div class="content">
            <div style="white-space: pre-wrap;">${communication.content}</div>
            
            ${communication.tags.length > 0 ? `
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e5e9;">
                <strong>Tags:</strong> ${communication.tags.join(', ')}
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>This message was sent from your property management system.</p>
            <p>If you need immediate assistance, please contact us directly.</p>
            <p style="margin-top: 15px; font-size: 12px;">
              Communication ID: ${communication.id}<br>
              Sent: ${new Date().toLocaleString()}
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
${communication.subject}

${communication.content}

${communication.tags.length > 0 ? `Tags: ${communication.tags.join(', ')}` : ''}

---
This message was sent from your property management system.
Communication ID: ${communication.id}
Sent: ${new Date().toLocaleString()}
    `.trim();

    return { subject: communication.subject, html, text };
  }

  static async processIncomingEmail(
    from: string,
    subject: string,
    content: string,
    tenantId?: string,
    propertyId?: string
  ): Promise<Communication | null> {
    if (!tenantId || !propertyId) {
      console.warn('Cannot process email without tenant and property IDs');
      return null;
    }

    try {
      const communication = await CommunicationOperations.create({
        tenantId,
        propertyId,
        type: CommunicationType.EMAIL,
        subject: `Incoming Email: ${subject}`,
        content: `From: ${from}\n\n${content}`,
        timestamp: new Date(),
        priority: CommunicationPriority.MEDIUM,
        status: CommunicationStatus.OPEN,
        createdBy: 'system',
        tags: ['incoming-email'],
        attachments: [],
        direction: CommunicationDirection.INCOMING,
        source: CommunicationSource.TENANT_REPLY
      });

      return communication;
    } catch (error) {
      console.error('Failed to process incoming email:', error);
      return null;
    }
  }

  static async sendBulkEmails(
    recipients: Array<{ email: string; tenantId: string; propertyId: string }>,
    template: EmailTemplate,
    config: Partial<EmailConfig> = {}
  ): Promise<Array<{ email: string; success: boolean; messageId?: string; error?: string }>> {
    const results = [];

    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient.email, template, config);
      results.push({
        email: recipient.email,
        ...result
      });

      // Log each email as a communication
      if (result.success) {
        try {
          await CommunicationOperations.create({
            tenantId: recipient.tenantId,
            propertyId: recipient.propertyId,
            type: CommunicationType.EMAIL,
            subject: `Bulk Email: ${template.subject}`,
            content: `Bulk email sent to ${recipient.email}\n\n${template.text || 'HTML email sent'}`,
            timestamp: new Date(),
            priority: CommunicationPriority.MEDIUM,
            status: CommunicationStatus.CLOSED,
            createdBy: 'system',
            tags: ['bulk-email'],
            attachments: [],
            direction: CommunicationDirection.OUTGOING,
            source: CommunicationSource.MANUAL
          });
        } catch (error) {
          console.error('Failed to log bulk email communication:', error);
        }
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  static async createEmailFromTemplate(
    templateContent: string,
    variables: Record<string, string>
  ): Promise<EmailTemplate> {
    let processedContent = templateContent;
    
    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });

    // Convert to HTML (basic formatting)
    const html = processedContent
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

    return {
      subject: variables.subject || 'Communication from Property Management',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              p { margin-bottom: 16px; }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `,
      text: processedContent
    };
  }
}

// Email webhook handler for incoming emails
export async function handleEmailWebhook(payload: any) {
  try {
    const { from, subject, text, html } = payload;
    
    // Extract tenant information from email (this would need to be implemented based on your email routing)
    // For now, this is a placeholder
    const tenantInfo = await extractTenantFromEmail(from);
    
    if (tenantInfo) {
      await EmailIntegration.processIncomingEmail(
        from,
        subject,
        text || html,
        tenantInfo.tenantId,
        tenantInfo.propertyId
      );
    }
  } catch (error) {
    console.error('Email webhook processing error:', error);
  }
}

// Placeholder function - would need to implement based on your tenant lookup logic
async function extractTenantFromEmail(email: string): Promise<{ tenantId: string; propertyId: string } | null> {
  // This would query your tenant database to find the tenant by email
  // For now, returning null as placeholder
  return null;
}
