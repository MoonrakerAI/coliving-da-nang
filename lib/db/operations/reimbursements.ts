import { 
  ReimbursementRequest, 
  CreateReimbursementRequestInput,
  UpdateReimbursementRequestInput,
  ApprovalActionInput,
  PaymentRecordingInput,
  ReimbursementFilters,
  BatchApprovalInput,
  ReimbursementStatus,
  StatusChange
} from '../models/reimbursement'
import { EmailNotificationService } from '../../services/email-notification'
import { v4 as uuidv4 } from 'uuid'

// In-memory storage for development (replace with actual database in production)
let reimbursementRequests: ReimbursementRequest[] = []

/**
 * Reset storage for testing purposes
 */
export function resetReimbursementStorage(): void {
  reimbursementRequests = []
}

/**
 * Create a new reimbursement request
 */
export async function createReimbursementRequest(
  input: CreateReimbursementRequestInput
): Promise<ReimbursementRequest> {
  const now = new Date()
  const id = uuidv4()
  
  const initialStatusChange: StatusChange = {
    id: uuidv4(),
    fromStatus: undefined,
    toStatus: 'Requested',
    changedBy: input.requestorId,
    changedAt: now,
    comment: 'Reimbursement request created'
  }

  const reimbursementRequest: ReimbursementRequest = {
    id,
    ...input,
    status: 'Requested',
    requestDate: now,
    comments: [],
    statusHistory: [initialStatusChange],
    createdAt: now,
    updatedAt: now
  }

  reimbursementRequests.push(reimbursementRequest)
  
  // Send notification for new reimbursement request
  try {
    await EmailNotificationService.sendReimbursementStatusNotification('requested', {
      reimbursement: reimbursementRequest,
      actionBy: input.requestorId
    })
  } catch (error) {
    console.error('Failed to send reimbursement request notification:', error)
    // Don't fail the operation if notification fails
  }
  
  return reimbursementRequest
}

/**
 * Get reimbursement request by ID
 */
export async function getReimbursementRequestById(id: string): Promise<ReimbursementRequest | null> {
  return reimbursementRequests.find(req => req.id === id && !req.deletedAt) || null
}

/**
 * Get all reimbursement requests with optional filters
 */
export async function getReimbursementRequests(
  filters?: ReimbursementFilters
): Promise<ReimbursementRequest[]> {
  let filteredRequests = reimbursementRequests.filter(req => !req.deletedAt)

  if (filters) {
    if (filters.propertyId) {
      filteredRequests = filteredRequests.filter(req => req.propertyId === filters.propertyId)
    }
    if (filters.requestorId) {
      filteredRequests = filteredRequests.filter(req => req.requestorId === filters.requestorId)
    }
    if (filters.status) {
      filteredRequests = filteredRequests.filter(req => req.status === filters.status)
    }
    if (filters.approvedBy) {
      filteredRequests = filteredRequests.filter(req => req.approvedBy === filters.approvedBy)
    }
    if (filters.requestDateFrom) {
      filteredRequests = filteredRequests.filter(req => req.requestDate >= filters.requestDateFrom!)
    }
    if (filters.requestDateTo) {
      filteredRequests = filteredRequests.filter(req => req.requestDate <= filters.requestDateTo!)
    }
    if (filters.amountMin) {
      filteredRequests = filteredRequests.filter(req => req.amountCents >= filters.amountMin!)
    }
    if (filters.amountMax) {
      filteredRequests = filteredRequests.filter(req => req.amountCents <= filters.amountMax!)
    }
    if (filters.paymentMethod) {
      filteredRequests = filteredRequests.filter(req => req.paymentMethod === filters.paymentMethod)
    }
  }

  return filteredRequests.sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime())
}

/**
 * Get pending reimbursement requests for approval
 */
export async function getPendingReimbursementRequests(
  propertyId?: string
): Promise<ReimbursementRequest[]> {
  const filters: ReimbursementFilters = { status: 'Requested' }
  if (propertyId) {
    filters.propertyId = propertyId
  }
  return getReimbursementRequests(filters)
}

/**
 * Approve or deny a reimbursement request
 */
export async function processApprovalAction(
  input: ApprovalActionInput
): Promise<ReimbursementRequest | null> {
  const request = await getReimbursementRequestById(input.reimbursementId)
  if (!request) return null

  if (request.status !== 'Requested') {
    throw new Error(`Cannot ${input.action} reimbursement request with status: ${request.status}`)
  }

  const now = new Date()
  const newStatus = input.action === 'approve' ? 'Approved' : 'Denied'
  
  const statusChange: StatusChange = {
    id: uuidv4(),
    fromStatus: request.status,
    toStatus: newStatus,
    changedBy: input.approvedBy,
    changedAt: now,
    comment: input.comment
  }

  // Update the request
  request.status = newStatus
  request.approvedBy = input.approvedBy
  request.approvedDate = now
  request.comments.push(input.comment)
  request.statusHistory.push(statusChange)
  request.updatedAt = now

  if (input.action === 'deny') {
    request.deniedReason = input.comment
  }

  // Send notification for status change
  try {
    const notificationType = input.action === 'approve' ? 'approved' : 'denied'
    await EmailNotificationService.sendReimbursementStatusNotification(notificationType, {
      reimbursement: request,
      actionBy: input.approvedBy,
      comment: input.comment,
      previousStatus: 'Requested'
    })
  } catch (error) {
    console.error('Failed to send approval/denial notification:', error)
    // Don't fail the operation if notification fails
  }

  return request
}

/**
 * Batch approve or deny multiple reimbursement requests
 */
export async function processBatchApproval(
  input: BatchApprovalInput
): Promise<ReimbursementRequest[]> {
  const results: ReimbursementRequest[] = []
  
  for (const reimbursementId of input.reimbursementIds) {
    try {
      const result = await processApprovalAction({
        reimbursementId,
        action: input.action,
        comment: input.comment,
        approvedBy: input.approvedBy
      })
      if (result) {
        results.push(result)
      }
    } catch (error) {
      console.error(`Failed to ${input.action} reimbursement ${reimbursementId}:`, error)
    }
  }
  
  return results
}

/**
 * Record payment for an approved reimbursement request
 */
export async function recordReimbursementPayment(
  input: PaymentRecordingInput
): Promise<ReimbursementRequest | null> {
  const request = await getReimbursementRequestById(input.reimbursementId)
  if (!request) return null

  if (request.status !== 'Approved') {
    throw new Error(`Cannot record payment for reimbursement request with status: ${request.status}`)
  }

  const now = new Date()
  const paidDate = input.paidDate || now
  
  const statusChange: StatusChange = {
    id: uuidv4(),
    fromStatus: request.status,
    toStatus: 'Paid',
    changedBy: input.paidBy,
    changedAt: now,
    comment: input.notes || 'Payment recorded'
  }

  // Update the request
  request.status = 'Paid'
  request.paidDate = paidDate
  request.paymentMethod = input.paymentMethod
  request.paymentReference = input.paymentReference
  request.statusHistory.push(statusChange)
  request.updatedAt = now

  if (input.notes) {
    request.comments.push(input.notes)
  }

  // Send notification for payment
  try {
    await EmailNotificationService.sendReimbursementStatusNotification('paid', {
      reimbursement: request,
      actionBy: input.paidBy,
      comment: input.notes,
      previousStatus: 'Approved'
    })
  } catch (error) {
    console.error('Failed to send payment notification:', error)
    // Don't fail the operation if notification fails
  }

  return request
}

/**
 * Update reimbursement request
 */
export async function updateReimbursementRequest(
  input: UpdateReimbursementRequestInput
): Promise<ReimbursementRequest | null> {
  const request = await getReimbursementRequestById(input.id)
  if (!request) return null

  const now = new Date()
  
  // Update allowed fields
  Object.assign(request, {
    ...input,
    updatedAt: now
  })

  return request
}

/**
 * Delete reimbursement request (soft delete)
 */
export async function deleteReimbursementRequest(id: string): Promise<boolean> {
  const request = await getReimbursementRequestById(id)
  if (!request) return false

  request.deletedAt = new Date()
  request.updatedAt = new Date()
  return true
}

/**
 * Get reimbursement statistics for reporting
 */
export async function getReimbursementStatistics(
  propertyId?: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  totalRequests: number
  totalAmountCents: number
  byStatus: Record<string, { count: number; amountCents: number }>
  byMonth: Record<string, { count: number; amountCents: number }>
}> {
  const filters: ReimbursementFilters = {}
  if (propertyId) filters.propertyId = propertyId
  if (dateFrom) filters.requestDateFrom = dateFrom
  if (dateTo) filters.requestDateTo = dateTo

  const requests = await getReimbursementRequests(filters)
  
  const stats = {
    totalRequests: requests.length,
    totalAmountCents: requests.reduce((sum, req) => sum + req.amountCents, 0),
    byStatus: {} as Record<string, { count: number; amountCents: number }>,
    byMonth: {} as Record<string, { count: number; amountCents: number }>
  }

  // Group by status
  for (const request of requests) {
    if (!stats.byStatus[request.status]) {
      stats.byStatus[request.status] = { count: 0, amountCents: 0 }
    }
    stats.byStatus[request.status].count++
    stats.byStatus[request.status].amountCents += request.amountCents
  }

  // Group by month
  for (const request of requests) {
    const monthKey = request.requestDate.toISOString().substring(0, 7) // YYYY-MM
    if (!stats.byMonth[monthKey]) {
      stats.byMonth[monthKey] = { count: 0, amountCents: 0 }
    }
    stats.byMonth[monthKey].count++
    stats.byMonth[monthKey].amountCents += request.amountCents
  }

  return stats
}

/**
 * Get outstanding reimbursement requests (Requested + Approved)
 */
export async function getOutstandingReimbursements(
  propertyId?: string
): Promise<ReimbursementRequest[]> {
  let requests = reimbursementRequests.filter(req => 
    !req.deletedAt && 
    (req.status === 'Requested' || req.status === 'Approved')
  )

  if (propertyId) {
    requests = requests.filter(req => req.propertyId === propertyId)
  }

  return requests.sort((a, b) => a.requestDate.getTime() - b.requestDate.getTime())
}
