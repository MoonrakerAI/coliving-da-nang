import { addDays, isAfter, isBefore, isToday, parseISO, startOfDay } from 'date-fns'
import { sendPaymentReminder, checkRateLimit, type ReminderEmailProps } from './reminder-sender'
import { getPaymentsByStatus, getPaymentById } from '../db/operations/payments'
import { getTenantById } from '../db/operations/tenants'
import { getPropertyById } from '../db/operations/properties'
import { createReminderLog, getReminderHistory, type ReminderLog } from '../db/operations/reminders'

export interface ReminderSettings {
  enabled: boolean
  daysBeforeDue: number[]
  daysAfterDue: number[]
  sendOnWeekends: boolean
  sendOnHolidays: boolean
  maxRemindersPerPayment: number
}

export interface PropertyReminderSettings extends ReminderSettings {
  propertyId: string
  customMessage?: string
  contactEmail?: string
}

export interface TenantReminderPreferences {
  tenantId: string
  emailEnabled: boolean
  customSchedule?: number[]
  optOut: boolean
}

// Default reminder settings
const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  daysBeforeDue: [7], // 7 days before
  daysAfterDue: [0, 3], // due date and 3 days after
  sendOnWeekends: false,
  sendOnHolidays: false,
  maxRemindersPerPayment: 5,
}

export async function processAutomatedReminders(): Promise<{
  processed: number
  sent: number
  skipped: number
  errors: string[]
}> {
  const results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    // Get all pending and overdue payments
    const pendingPayments = await getPaymentsByStatus(['pending', 'overdue'])
    
    for (const payment of pendingPayments) {
      results.processed++
      
      try {
        const shouldSend = await shouldSendReminder(payment)
        
        if (!shouldSend.send) {
          results.skipped++
          console.log(`Skipping reminder for payment ${payment.id}: ${shouldSend.reason}`)
          continue
        }

        const reminderSent = await sendReminderForPayment(payment, shouldSend.reminderType!)
        
        if (reminderSent) {
          results.sent++
        } else {
          results.skipped++
        }
      } catch (error) {
        const errorMsg = `Failed to process payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        results.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }
  } catch (error) {
    const errorMsg = `Failed to process automated reminders: ${error instanceof Error ? error.message : 'Unknown error'}`
    results.errors.push(errorMsg)
    console.error(errorMsg)
  }

  console.log(`Reminder processing complete: ${results.sent} sent, ${results.skipped} skipped, ${results.errors.length} errors`)
  return results
}

async function shouldSendReminder(payment: any): Promise<{
  send: boolean
  reason?: string
  reminderType?: 'upcoming' | 'due' | 'overdue'
}> {
  // Skip if payment is already paid
  if (payment.status === 'paid') {
    return { send: false, reason: 'Payment already paid' }
  }

  const dueDate = parseISO(payment.dueDate)
  const today = startOfDay(new Date())
  const dueDateStart = startOfDay(dueDate)

  // Get reminder settings for this property
  const settings = await getReminderSettings(payment.propertyId)
  
  if (!settings.enabled) {
    return { send: false, reason: 'Reminders disabled for property' }
  }

  // Check tenant preferences
  const tenantPrefs = await getTenantReminderPreferences(payment.tenantId)
  if (tenantPrefs?.optOut || !tenantPrefs?.emailEnabled) {
    return { send: false, reason: 'Tenant opted out of reminders' }
  }

  // Check if we've already sent too many reminders
  const reminderHistory = await getReminderHistory(payment.id)
  if (reminderHistory.length >= settings.maxRemindersPerPayment) {
    return { send: false, reason: 'Maximum reminders reached' }
  }

  // Determine reminder type and check if we should send
  let reminderType: 'upcoming' | 'due' | 'overdue'
  let shouldSend = false

  if (isAfter(today, dueDateStart)) {
    // Payment is overdue
    reminderType = 'overdue'
    const daysOverdue = Math.floor((today.getTime() - dueDateStart.getTime()) / (1000 * 60 * 60 * 24))
    shouldSend = settings.daysAfterDue.includes(daysOverdue)
  } else if (isToday(dueDate)) {
    // Payment is due today
    reminderType = 'due'
    shouldSend = settings.daysAfterDue.includes(0)
  } else {
    // Payment is upcoming
    reminderType = 'upcoming'
    const daysUntilDue = Math.floor((dueDateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    shouldSend = settings.daysBeforeDue.includes(daysUntilDue)
  }

  if (!shouldSend) {
    return { send: false, reason: 'Not scheduled for today' }
  }

  // Check if we already sent a reminder today for this payment
  const todayReminders = reminderHistory.filter(r => 
    startOfDay(parseISO(r.sentAt)).getTime() === today.getTime()
  )
  
  if (todayReminders.length > 0) {
    return { send: false, reason: 'Already sent reminder today' }
  }

  // Check weekend/holiday restrictions
  const dayOfWeek = today.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  
  if (isWeekend && !settings.sendOnWeekends) {
    return { send: false, reason: 'Weekend sending disabled' }
  }

  // TODO: Add holiday checking if needed
  // if (isHoliday(today) && !settings.sendOnHolidays) {
  //   return { send: false, reason: 'Holiday sending disabled' }
  // }

  return { send: true, reminderType }
}

async function sendReminderForPayment(payment: any, reminderType: 'upcoming' | 'due' | 'overdue'): Promise<boolean> {
  try {
    // Get tenant and property details
    const tenant = await getTenantById(payment.tenantId)
    const property = await getPropertyById(payment.propertyId)
    
    if (!tenant || !property) {
      console.error(`Missing tenant or property data for payment ${payment.id}`)
      return false
    }

    // Check rate limiting
    if (!checkRateLimit(tenant.email)) {
      console.log(`Rate limit exceeded for tenant ${tenant.email}`)
      return false
    }

    // Get property-specific settings
    const propertySettings = await getPropertyReminderSettings(payment.propertyId)
    
    const reminderProps: ReminderEmailProps = {
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      paymentAmount: payment.amount,
      dueDate: payment.dueDate,
      propertyName: property.name,
      paymentMethods: property.paymentMethods || ['Bank Transfer', 'Cash'],
      contactEmail: propertySettings?.contactEmail || property.contactEmail || 'management@coliving-danang.com',
      paymentReference: payment.reference || `PAY-${payment.id}`,
      propertyLogo: property.logoUrl,
      reminderType,
    }

    const result = await sendPaymentReminder(reminderProps)
    
    if (result.success) {
      // Log the reminder
      await createReminderLog({
        paymentId: payment.id,
        tenantId: payment.tenantId,
        propertyId: payment.propertyId,
        reminderType,
        emailAddress: tenant.email,
        messageId: result.messageId,
        status: 'sent',
        sentAt: new Date().toISOString(),
      })
      
      console.log(`Reminder sent successfully for payment ${payment.id}`)
      return true
    } else {
      // Log the failure
      await createReminderLog({
        paymentId: payment.id,
        tenantId: payment.tenantId,
        propertyId: payment.propertyId,
        reminderType,
        emailAddress: tenant.email,
        status: 'failed',
        error: result.error,
        sentAt: new Date().toISOString(),
      })
      
      console.error(`Failed to send reminder for payment ${payment.id}: ${result.error}`)
      return false
    }
  } catch (error) {
    console.error(`Error sending reminder for payment ${payment.id}:`, error)
    return false
  }
}

export async function sendManualReminder(
  paymentId: string,
  reminderType: 'upcoming' | 'due' | 'overdue',
  customMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get payment details (this would need to be implemented in the payments DB module)
    const payment = await getPaymentByIdForReminder(paymentId)
    if (!payment) {
      return { success: false, error: 'Payment not found' }
    }

    const sent = await sendReminderForPayment(payment, reminderType)
    
    if (sent) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to send reminder' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Settings management functions
async function getReminderSettings(propertyId: string): Promise<ReminderSettings> {
  // TODO: Implement database lookup for property-specific settings
  // For now, return default settings
  return DEFAULT_REMINDER_SETTINGS
}

async function getPropertyReminderSettings(propertyId: string): Promise<PropertyReminderSettings | null> {
  // TODO: Implement database lookup for property-specific reminder settings
  return null
}

async function getTenantReminderPreferences(tenantId: string): Promise<TenantReminderPreferences | null> {
  // TODO: Implement database lookup for tenant preferences
  // For now, assume all tenants want email reminders
  return {
    tenantId,
    emailEnabled: true,
    optOut: false,
  }
}

// Placeholder for payment lookup - this would need to be implemented
async function getPaymentByIdForReminder(paymentId: string): Promise<any> {
  // TODO: Implement payment lookup by ID
  return null
}
