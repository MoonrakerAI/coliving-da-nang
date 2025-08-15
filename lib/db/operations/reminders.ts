import { kv } from '@vercel/kv'
import { v4 as uuidv4 } from 'uuid'
import {
  ReminderLog,
  CreateReminderLogInput,
  UpdateReminderLogInput,
  ReminderSettings,
  CreateReminderSettingsInput,
  UpdateReminderSettingsInput,
  TenantReminderPreferences,
  CreateTenantReminderPreferencesInput,
  UpdateTenantReminderPreferencesInput,
  ReminderLogFilters,
  ReminderAnalytics
} from '../models/reminder'

// Reminder Log Operations
export async function createReminderLog(input: CreateReminderLogInput): Promise<ReminderLog> {
  const id = uuidv4()
  const now = new Date()
  
  const reminderLog: ReminderLog = {
    id,
    ...input,
    createdAt: now,
    updatedAt: now
  }

  // Store in KV with multiple indexes for efficient querying
  await Promise.all([
    kv.hset(`reminder_log:${id}`, reminderLog),
    kv.sadd(`reminder_logs:payment:${input.paymentId}`, id),
    kv.sadd(`reminder_logs:tenant:${input.tenantId}`, id),
    kv.sadd(`reminder_logs:property:${input.propertyId}`, id),
    kv.sadd(`reminder_logs:type:${input.reminderType}`, id),
    kv.sadd(`reminder_logs:status:${input.status}`, id),
    kv.zadd(`reminder_logs:by_date`, { score: now.getTime(), member: id })
  ])

  return reminderLog
}

export async function updateReminderLog(id: string, input: UpdateReminderLogInput): Promise<ReminderLog | null> {
  const existing = await kv.hgetall(`reminder_log:${id}`) as ReminderLog | null
  if (!existing) return null

  const updated: ReminderLog = {
    ...existing,
    ...input,
    updatedAt: new Date()
  }

  // Update status indexes if status changed
  if (input.status && input.status !== existing.status) {
    await Promise.all([
      kv.srem(`reminder_logs:status:${existing.status}`, id),
      kv.sadd(`reminder_logs:status:${input.status}`, id)
    ])
  }

  await kv.hset(`reminder_log:${id}`, updated)
  return updated
}

export async function getReminderLog(id: string): Promise<ReminderLog | null> {
  const reminderLog = await kv.hgetall(`reminder_log:${id}`) as ReminderLog | null
  return reminderLog
}

export async function getReminderHistory(paymentId: string): Promise<ReminderLog[]> {
  const reminderIds = await kv.smembers(`reminder_logs:payment:${paymentId}`)
  if (!reminderIds.length) return []

  const reminders = await Promise.all(
    reminderIds.map(id => kv.hgetall(`reminder_log:${id}`))
  )

  return reminders
    .filter((reminder): reminder is ReminderLog => reminder !== null)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
}

export async function getReminderLogs(filters: ReminderLogFilters = {}): Promise<ReminderLog[]> {
  let reminderIds: string[] = []

  // Apply filters to get relevant reminder IDs
  if (filters.paymentId) {
    reminderIds = await kv.smembers(`reminder_logs:payment:${filters.paymentId}`)
  } else if (filters.tenantId) {
    reminderIds = await kv.smembers(`reminder_logs:tenant:${filters.tenantId}`)
  } else if (filters.propertyId) {
    reminderIds = await kv.smembers(`reminder_logs:property:${filters.propertyId}`)
  } else if (filters.reminderType) {
    reminderIds = await kv.smembers(`reminder_logs:type:${filters.reminderType}`)
  } else if (filters.status) {
    reminderIds = await kv.smembers(`reminder_logs:status:${filters.status}`)
  } else {
    // Get all reminder IDs from date index
    const results = await kv.zrange('reminder_logs:by_date', 0, -1)
    reminderIds = results as string[]
  }

  if (!reminderIds.length) return []

  const reminders = await Promise.all(
    reminderIds.map(id => kv.hgetall(`reminder_log:${id}`))
  )

  let filteredReminders = reminders
    .filter((reminder): reminder is ReminderLog => reminder !== null)

  // Apply additional filters
  if (filters.sentFrom) {
    const fromDate = new Date(filters.sentFrom)
    filteredReminders = filteredReminders.filter(r => new Date(r.sentAt) >= fromDate)
  }

  if (filters.sentTo) {
    const toDate = new Date(filters.sentTo)
    filteredReminders = filteredReminders.filter(r => new Date(r.sentAt) <= toDate)
  }

  return filteredReminders.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
}

// Reminder Settings Operations
export async function createReminderSettings(input: CreateReminderSettingsInput): Promise<ReminderSettings> {
  const id = uuidv4()
  const now = new Date()
  
  const settings: ReminderSettings = {
    id,
    ...input,
    createdAt: now,
    updatedAt: now
  }

  const key = input.propertyId ? `reminder_settings:property:${input.propertyId}` : 'reminder_settings:global'
  await kv.hset(key, settings)

  return settings
}

export async function updateReminderSettings(
  propertyId: string | null,
  input: UpdateReminderSettingsInput
): Promise<ReminderSettings | null> {
  const key = propertyId ? `reminder_settings:property:${propertyId}` : 'reminder_settings:global'
  const existing = await kv.hgetall(key) as ReminderSettings | null
  
  if (!existing) return null

  const updated: ReminderSettings = {
    ...existing,
    ...input,
    updatedAt: new Date()
  }

  await kv.hset(key, updated)
  return updated
}

export async function getReminderSettings(propertyId?: string): Promise<ReminderSettings | null> {
  let settings: ReminderSettings | null = null

  // Try property-specific settings first
  if (propertyId) {
    settings = await kv.hgetall(`reminder_settings:property:${propertyId}`) as ReminderSettings | null
  }

  // Fall back to global settings if no property-specific settings
  if (!settings) {
    settings = await kv.hgetall('reminder_settings:global') as ReminderSettings | null
  }

  return settings
}

export async function deleteReminderSettings(propertyId: string | null): Promise<boolean> {
  const key = propertyId ? `reminder_settings:property:${propertyId}` : 'reminder_settings:global'
  const result = await kv.del(key)
  return result > 0
}

// Tenant Reminder Preferences Operations
export async function createTenantReminderPreferences(
  input: CreateTenantReminderPreferencesInput
): Promise<TenantReminderPreferences> {
  const id = uuidv4()
  const now = new Date()
  
  const preferences: TenantReminderPreferences = {
    id,
    ...input,
    createdAt: now,
    updatedAt: now
  }

  await kv.hset(`tenant_reminder_prefs:${input.tenantId}`, preferences)
  return preferences
}

export async function updateTenantReminderPreferences(
  tenantId: string,
  input: UpdateTenantReminderPreferencesInput
): Promise<TenantReminderPreferences | null> {
  const existing = await kv.hgetall(`tenant_reminder_prefs:${tenantId}`) as TenantReminderPreferences | null
  
  if (!existing) return null

  const updated: TenantReminderPreferences = {
    ...existing,
    ...input,
    updatedAt: new Date()
  }

  await kv.hset(`tenant_reminder_prefs:${tenantId}`, updated)
  return updated
}

export async function getTenantReminderPreferences(tenantId: string): Promise<TenantReminderPreferences | null> {
  const preferences = await kv.hgetall(`tenant_reminder_prefs:${tenantId}`) as TenantReminderPreferences | null
  return preferences
}

export async function deleteTenantReminderPreferences(tenantId: string): Promise<boolean> {
  const result = await kv.del(`tenant_reminder_prefs:${tenantId}`)
  return result > 0
}

// Analytics Operations
export async function getReminderAnalytics(
  propertyId?: string,
  from?: string,
  to?: string
): Promise<ReminderAnalytics> {
  const filters: ReminderLogFilters = {
    propertyId,
    sentFrom: from,
    sentTo: to
  }

  const logs = await getReminderLogs(filters)

  const totalSent = logs.length
  const totalDelivered = logs.filter(log => log.status === 'delivered' || log.status === 'opened').length
  const totalOpened = logs.filter(log => log.status === 'opened').length
  const totalBounced = logs.filter(log => log.status === 'bounced').length
  const totalFailed = logs.filter(log => log.status === 'failed').length

  const deliveryRate = totalSent > 0 ? totalDelivered / totalSent : 0
  const openRate = totalDelivered > 0 ? totalOpened / totalDelivered : 0
  const bounceRate = totalSent > 0 ? totalBounced / totalSent : 0

  // Calculate effectiveness rate (would need payment status tracking)
  // For now, using open rate as a proxy
  const effectivenessRate = openRate

  return {
    totalSent,
    totalDelivered,
    totalOpened,
    totalBounced,
    totalFailed,
    deliveryRate,
    openRate,
    bounceRate,
    effectivenessRate,
    period: {
      from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString()
    }
  }
}

// Utility functions for webhook handling
export async function handleResendWebhook(event: any): Promise<void> {
  const { type, data } = event

  if (!data?.email_id) return

  // Find reminder log by message ID
  const reminderIds = await kv.smembers('reminder_logs:by_message_id')
  let reminderLog: ReminderLog | null = null

  for (const id of reminderIds) {
    const log = await kv.hgetall(`reminder_log:${id}`) as ReminderLog | null
    if (log?.messageId === data.email_id) {
      reminderLog = log
      break
    }
  }

  if (!reminderLog) return

  const updates: UpdateReminderLogInput = {}

  switch (type) {
    case 'email.delivered':
      updates.status = 'delivered'
      updates.deliveredAt = new Date().toISOString()
      break
    case 'email.opened':
      updates.status = 'opened'
      updates.openedAt = new Date().toISOString()
      break
    case 'email.bounced':
      updates.status = 'bounced'
      updates.error = data.reason || 'Email bounced'
      break
    case 'email.delivery_delayed':
      // Keep as sent, but could log the delay
      break
  }

  if (Object.keys(updates).length > 0) {
    await updateReminderLog(reminderLog.id, updates)
  }
}

// Cleanup old reminder logs (run periodically)
export async function cleanupOldReminderLogs(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
  const cutoffScore = cutoffDate.getTime()

  // Get old reminder IDs
  const oldReminderIds = await kv.zrangebyscore('reminder_logs:by_date', 0, cutoffScore)
  
  if (!oldReminderIds.length) return 0

  // Delete old reminders and their indexes
  const deletePromises = oldReminderIds.map(async (id) => {
    const reminder = await kv.hgetall(`reminder_log:${id}`) as ReminderLog | null
    if (!reminder) return

    await Promise.all([
      kv.del(`reminder_log:${id}`),
      kv.srem(`reminder_logs:payment:${reminder.paymentId}`, id),
      kv.srem(`reminder_logs:tenant:${reminder.tenantId}`, id),
      kv.srem(`reminder_logs:property:${reminder.propertyId}`, id),
      kv.srem(`reminder_logs:type:${reminder.reminderType}`, id),
      kv.srem(`reminder_logs:status:${reminder.status}`, id),
      kv.zrem('reminder_logs:by_date', id)
    ])
  })

  await Promise.all(deletePromises)
  return oldReminderIds.length
}
