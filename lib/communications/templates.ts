import { CommunicationTemplate } from '@/lib/db/models/communication';

// Default communication templates
export const defaultTemplates: Omit<CommunicationTemplate, 'id' | 'usageCount' | 'createdBy' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Welcome New Tenant',
    category: 'Welcome',
    subject: 'Welcome to {{propertyName}}!',
    content: `Dear {{tenantName}},

Welcome to {{propertyName}}! We're excited to have you as part of our community.

Here are some important details for your move-in:
- Your room number is {{roomNumber}}
- Move-in date: {{moveInDate}}
- Monthly rent: {{monthlyRent}}
- Security deposit: {{securityDeposit}}

House Rules:
- Quiet hours: 10 PM - 7 AM
- No smoking inside the property
- Keep common areas clean
- Respect your housemates

If you have any questions or concerns, please don't hesitate to reach out.

Best regards,
{{propertyManagerName}}`,
    variables: ['tenantName', 'propertyName', 'roomNumber', 'moveInDate', 'monthlyRent', 'securityDeposit', 'propertyManagerName'],
    language: 'en',
    isActive: true
  },
  {
    name: 'Payment Reminder',
    category: 'Payment',
    subject: 'Rent Payment Reminder - {{propertyName}}',
    content: `Dear {{tenantName}},

This is a friendly reminder that your rent payment for {{monthYear}} is due on {{dueDate}}.

Payment Details:
- Amount due: {{amountDue}}
- Due date: {{dueDate}}
- Late fee after: {{lateFeeDate}}

Please ensure your payment is submitted on time to avoid any late fees.

If you have any questions about your payment, please contact us immediately.

Thank you,
{{propertyManagerName}}`,
    variables: ['tenantName', 'propertyName', 'monthYear', 'dueDate', 'amountDue', 'lateFeeDate', 'propertyManagerName'],
    language: 'en',
    isActive: true
  },
  {
    name: 'Maintenance Request Acknowledgment',
    category: 'Maintenance',
    subject: 'Maintenance Request Received - {{requestType}}',
    content: `Dear {{tenantName}},

We have received your maintenance request for {{requestType}} in room {{roomNumber}}.

Request Details:
- Issue: {{issueDescription}}
- Priority: {{priority}}
- Submitted: {{submissionDate}}
- Expected resolution: {{expectedResolution}}

Our maintenance team will address this issue as soon as possible. We will keep you updated on the progress.

If this is an emergency, please call our emergency hotline at {{emergencyNumber}}.

Best regards,
{{propertyManagerName}}`,
    variables: ['tenantName', 'requestType', 'roomNumber', 'issueDescription', 'priority', 'submissionDate', 'expectedResolution', 'emergencyNumber', 'propertyManagerName'],
    language: 'en',
    isActive: true
  },
  {
    name: 'Lease Renewal Notice',
    category: 'Lease',
    subject: 'Lease Renewal - {{propertyName}}',
    content: `Dear {{tenantName}},

Your current lease for room {{roomNumber}} at {{propertyName}} will expire on {{leaseEndDate}}.

We would like to offer you the opportunity to renew your lease with the following terms:
- New lease period: {{newLeasePeriod}}
- Monthly rent: {{newRent}}
- Lease start date: {{newLeaseStartDate}}

Please let us know by {{responseDeadline}} if you would like to renew your lease.

If you have any questions or would like to discuss the terms, please contact us.

Thank you,
{{propertyManagerName}}`,
    variables: ['tenantName', 'roomNumber', 'propertyName', 'leaseEndDate', 'newLeasePeriod', 'newRent', 'newLeaseStartDate', 'responseDeadline', 'propertyManagerName'],
    language: 'en',
    isActive: true
  },
  {
    name: 'Move-Out Instructions',
    category: 'Move-Out',
    subject: 'Move-Out Instructions - {{propertyName}}',
    content: `Dear {{tenantName}},

As your lease end date of {{leaseEndDate}} approaches, here are the move-out instructions:

Move-Out Checklist:
- Schedule final inspection: {{inspectionDate}}
- Return all keys and access cards
- Clean your room and common areas used
- Remove all personal belongings
- Provide forwarding address for deposit return

Security Deposit:
- Original deposit: {{securityDeposit}}
- Inspection will determine any deductions
- Refund will be processed within {{refundPeriod}} days

Final utilities and prorated rent will be calculated after move-out.

Please contact us to schedule your final inspection.

Best regards,
{{propertyManagerName}}`,
    variables: ['tenantName', 'leaseEndDate', 'inspectionDate', 'securityDeposit', 'refundPeriod', 'propertyManagerName'],
    language: 'en',
    isActive: true
  },
  {
    name: 'Complaint Follow-Up',
    category: 'Complaint',
    subject: 'Follow-up on Your Concern - {{complaintType}}',
    content: `Dear {{tenantName}},

Thank you for bringing the {{complaintType}} issue to our attention on {{complaintDate}}.

We have taken the following actions:
{{actionsToken}}

Current Status: {{currentStatus}}

We take all tenant concerns seriously and are committed to resolving this matter promptly.

If you have any additional concerns or if the issue persists, please don't hesitate to contact us.

Thank you for your patience,
{{propertyManagerName}}`,
    variables: ['tenantName', 'complaintType', 'complaintDate', 'actionsToken', 'currentStatus', 'propertyManagerName'],
    language: 'en',
    isActive: true
  },
  {
    name: 'House Rules Reminder',
    category: 'General',
    subject: 'House Rules Reminder - {{propertyName}}',
    content: `Dear {{tenantName}},

This is a friendly reminder about our house rules at {{propertyName}}:

Common Area Guidelines:
- Keep kitchen clean after use
- Take turns with laundry facilities
- Respect shared spaces
- No overnight guests without prior approval

Noise Policy:
- Quiet hours: 10 PM - 7 AM
- Keep music and TV at reasonable volumes
- Be considerate of your housemates

Other Important Rules:
- No smoking inside the property
- No pets without written approval
- Visitors must be accompanied by tenants

Thank you for helping maintain a pleasant living environment for everyone.

Best regards,
{{propertyManagerName}}`,
    variables: ['tenantName', 'propertyName', 'propertyManagerName'],
    language: 'en',
    isActive: true
  }
];

// Template variable suggestions based on context
export const templateVariableSuggestions = {
  tenant: ['tenantName', 'roomNumber', 'moveInDate', 'leaseEndDate'],
  property: ['propertyName', 'propertyAddress', 'propertyManagerName', 'emergencyNumber'],
  payment: ['monthlyRent', 'amountDue', 'dueDate', 'lateFeeDate', 'securityDeposit'],
  maintenance: ['requestType', 'issueDescription', 'priority', 'expectedResolution'],
  lease: ['leasePeriod', 'leaseStartDate', 'leaseEndDate', 'newRent', 'responseDeadline'],
  general: ['currentDate', 'monthYear', 'refundPeriod']
};

// Template processing utilities
export class TemplateProcessor {
  static processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    });
    
    return processed;
  }

  static extractVariables(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  static validateTemplate(template: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for unmatched braces
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Unmatched template braces');
    }
    
    // Check for empty variables
    const emptyVariables = template.match(/\{\{\s*\}\}/g);
    if (emptyVariables) {
      errors.push('Empty template variables found');
    }
    
    // Check for invalid variable names
    const invalidVariables = template.match(/\{\{[^a-zA-Z0-9_]+\}\}/g);
    if (invalidVariables) {
      errors.push('Invalid variable names (use only letters, numbers, and underscores)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static getTemplateSuggestions(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'Welcome': [...templateVariableSuggestions.tenant, ...templateVariableSuggestions.property],
      'Payment': [...templateVariableSuggestions.tenant, ...templateVariableSuggestions.payment],
      'Maintenance': [...templateVariableSuggestions.tenant, ...templateVariableSuggestions.maintenance],
      'Lease': [...templateVariableSuggestions.tenant, ...templateVariableSuggestions.lease],
      'General': [...templateVariableSuggestions.tenant, ...templateVariableSuggestions.general]
    };
    
    return categoryMap[category] || templateVariableSuggestions.general;
  }
}
