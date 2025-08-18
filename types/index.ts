import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: UserRole;
  }
}

// Re-export all types from database models for consistency
export * from '../lib/db/models/tenant'
export * from '../lib/db/models/property'
export * from '../lib/db/models/payment'
export * from '../lib/db/models/expense'
export * from '../lib/db/models/user'
export * from '../lib/db/models/agreement'
// Note: Communication types are already exported from tenant model
export * from '../lib/db/models/expense-category'
export * from '../lib/db/models/reimbursement'
export * from '../lib/db/models/reminder'
export * from '../lib/db/models/room'
export * from '../lib/db/models/audit-log'

// Legacy User types for compatibility (to be migrated)
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  propertyId?: string
  createdAt: Date
  updatedAt: Date
}

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  TENANT = 'tenant'
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form types for UI components
export interface CreatePropertyForm {
  name: string
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  roomCount: number
  settings: {
    allowPets: boolean
    smokingAllowed: boolean
    maxOccupancy: number
    checkInTime: string
    checkOutTime: string
    wifiPassword?: string
    parkingAvailable: boolean
  }
  houseRules: string[]
  ownerId: string
}

export interface CreateTenantForm {
  email: string
  firstName: string
  lastName: string
  phone: string
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  propertyId: string
  roomNumber: string
  leaseStart: string
  leaseEnd: string
  monthlyRentCents: number
  depositCents: number
  profilePhoto?: string
}

export interface CreatePaymentForm {
  tenantId: string
  propertyId: string
  amountCents: number
  currency: string
  paymentMethod: string
  description: string
  dueDate: string
  reference?: string
  notes?: string
}

export interface CreateExpenseForm {
  propertyId: string
  userId: string
  amountCents: number
  currency: string
  category: string
  description: string
  expenseDate: string
  receiptPhotos?: string[]
  needsReimbursement: boolean
  location?: {
    latitude: number
    longitude: number
    address?: string
    placeName?: string
  }
}

// Dashboard and analytics types
export interface PropertyDashboard {
  property: Property
  tenants: Tenant[]
  recentPayments: Payment[]
  overduePayments: Payment[]
  recentExpenses: Expense[]
  monthlyRevenue: number
  monthlyExpenses: number
  occupancyRate: number
}

export interface PaymentSummary {
  totalPaid: number
  totalPending: number
  totalOverdue: number
  paymentsByMethod: Record<string, number>
  paymentsByStatus: Record<string, number>
}

export interface ExpenseSummary {
  totalExpenses: number
  expensesByCategory: Record<string, number>
  pendingReimbursements: number
  averageMonthlyExpenses: number
}

// Task Management Types
export interface Task {
  id: string
  propertyId: string
  title: string
  description: string
  instructions?: string
  category: TaskCategory
  priority: TaskPriority
  assignedTo: string[]
  createdBy: string
  dueDate?: Date
  estimatedDuration?: number // minutes
  status: TaskStatus
  completedAt?: Date
  completedBy?: string
  completionNotes?: string
  completionPhotos: string[]
  qualityRating?: number
  recurrence?: RecurrencePattern
  templateId?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export enum TaskCategory {
  CLEANING = 'Cleaning',
  MAINTENANCE = 'Maintenance',
  ADMINISTRATIVE = 'Administrative',
  INSPECTION = 'Inspection',
  EMERGENCY = 'Emergency',
  OTHER = 'Other'
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium', 
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum TaskStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  OVERDUE = 'Overdue',
  CANCELLED = 'Cancelled'
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  interval: number
  daysOfWeek?: number[]
  endDate?: Date
  assignmentRotation: boolean
}

export interface TaskTemplate {
  id: string
  name: string
  description: string
  instructions?: string
  category: TaskCategory
  priority: TaskPriority
  estimatedDuration?: number
  defaultRecurrence?: RecurrencePattern
  isPublic: boolean
  createdBy: string
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

// Task Form Types
export interface CreateTaskForm {
  title: string
  description: string
  instructions?: string
  category: TaskCategory
  priority: TaskPriority
  assignedTo: string[]
  dueDate?: string
  estimatedDuration?: number
  recurrence?: RecurrencePattern
  templateId?: string
}

export interface CompleteTaskForm {
  completionNotes?: string
  completionPhotos?: string[]
  qualityRating?: number
}

export interface TaskFilters {
  status?: TaskStatus[]
  category?: TaskCategory[]
  priority?: TaskPriority[]
  assignedTo?: string[]
  propertyId?: string
  dueDate?: {
    from?: Date
    to?: Date
  }
}

// Task Dashboard Types
export interface TaskDashboard {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  tasksByStatus: Record<TaskStatus, number>
  tasksByCategory: Record<TaskCategory, number>
  tasksByPriority: Record<TaskPriority, number>
  recentTasks: Task[]
  upcomingDeadlines: Task[]
}

// Task View State Management Types (Story 4.2)
export interface TaskViewState {
  viewType: 'list' | 'kanban' | 'dashboard'
  filters: TaskFilters
  sortBy: TaskSortField
  sortOrder: 'asc' | 'desc'
  selectedTasks: string[]
  searchQuery: string
}

export interface TaskFiltersExtended extends TaskFilters {
  assignee?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

export enum TaskSortField {
  DUE_DATE = 'dueDate',
  PRIORITY = 'priority',
  CREATED_DATE = 'createdAt',
  ASSIGNEE = 'assignedTo',
  TITLE = 'title',
  STATUS = 'status',
  CATEGORY = 'category'
}

// Kanban Board Types
export interface KanbanColumn {
  id: string
  title: string
  status: TaskStatus
  wipLimit?: number
  tasks: Task[]
}

export interface KanbanBoard {
  columns: KanbanColumn[]
  propertyId: string
}

// Bulk Operations Types
export interface BulkTaskOperation {
  taskIds: string[]
  operation: 'assign' | 'priority' | 'category' | 'deadline' | 'complete' | 'cancel'
  value: any
}

export interface BulkAssignOperation extends BulkTaskOperation {
  operation: 'assign'
  value: string[] // user IDs
}

export interface BulkPriorityOperation extends BulkTaskOperation {
  operation: 'priority'
  value: TaskPriority
}

export interface BulkCategoryOperation extends BulkTaskOperation {
  operation: 'category'
  value: TaskCategory
}

export interface BulkDeadlineOperation extends BulkTaskOperation {
  operation: 'deadline'
  value: Date
}

// Task Metrics Types
export interface TaskMetrics {
  completionRate: number
  averageCompletionTime: number // in hours
  overdueRate: number
  tasksByUser: Record<string, UserTaskMetrics>
  tasksByCategory: Record<TaskCategory, CategoryMetrics>
  productivityTrends: ProductivityTrend[]
}

export interface UserTaskMetrics {
  userId: string
  userName: string
  totalAssigned: number
  totalCompleted: number
  completionRate: number
  averageCompletionTime: number
  overdueCount: number
  qualityRating: number
}

export interface CategoryMetrics {
  category: TaskCategory
  totalTasks: number
  completedTasks: number
  averageCompletionTime: number
  overdueRate: number
}

export interface ProductivityTrend {
  date: Date
  tasksCompleted: number
  tasksCreated: number
  averageCompletionTime: number
}

// Search Types
export interface TaskSearchResult {
  task: Task
  relevanceScore: number
  matchedFields: string[]
}

export interface TaskSearchQuery {
  query: string
  filters?: TaskFiltersExtended
  sortBy?: TaskSortField
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Personal Dashboard Types
export interface PersonalTaskDashboard {
  userId: string
  assignedTasks: Task[]
  completedToday: number
  completedThisWeek: number
  overdueCount: number
  upcomingDeadlines: Task[]
  workloadDistribution: Record<TaskCategory, number>
  productivityScore: number
  recentActivity: TaskActivity[]
}

export interface TaskActivity {
  id: string
  taskId: string
  taskTitle: string
  action: 'created' | 'assigned' | 'completed' | 'updated' | 'commented'
  timestamp: Date
  userId: string
  userName: string
  details?: string
}
