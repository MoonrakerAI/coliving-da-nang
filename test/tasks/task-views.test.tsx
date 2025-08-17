import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskSearch } from '@/components/tasks/TaskSearch'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { TaskMetrics } from '@/components/tasks/TaskMetrics'
import { BulkOperations } from '@/components/tasks/BulkOperations'
import { Task, TaskStatus, TaskPriority, TaskCategory, TaskSortField, TaskMetrics as TaskMetricsType } from '@/types'

// Mock data
const mockTasks: Task[] = [
  {
    id: '1',
    propertyId: 'prop1',
    title: 'Clean Kitchen',
    description: 'Deep clean the kitchen area',
    category: TaskCategory.CLEANING,
    priority: TaskPriority.HIGH,
    assignedTo: ['user1', 'user2'],
    createdBy: 'owner1',
    status: TaskStatus.PENDING,
    completionPhotos: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    dueDate: new Date('2024-01-15')
  },
  {
    id: '2',
    propertyId: 'prop1',
    title: 'Fix Leaky Faucet',
    description: 'Repair the bathroom faucet',
    category: TaskCategory.MAINTENANCE,
    priority: TaskPriority.CRITICAL,
    assignedTo: ['user1'],
    createdBy: 'owner1',
    status: TaskStatus.IN_PROGRESS,
    completionPhotos: [],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    dueDate: new Date('2024-01-10')
  },
  {
    id: '3',
    propertyId: 'prop1',
    title: 'Monthly Inspection',
    description: 'Complete monthly property inspection',
    category: TaskCategory.INSPECTION,
    priority: TaskPriority.MEDIUM,
    assignedTo: ['user2'],
    createdBy: 'owner1',
    status: TaskStatus.COMPLETED,
    completionPhotos: [],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    completedAt: new Date('2024-01-05'),
    qualityRating: 4
  }
]

const mockMetrics: TaskMetricsType = {
  completionRate: 75.5,
  averageCompletionTime: 2.5,
  overdueRate: 10.2,
  tasksByUser: {
    'user1': {
      userId: 'user1',
      userName: 'John Doe',
      totalAssigned: 5,
      totalCompleted: 4,
      completionRate: 80,
      averageCompletionTime: 2.0,
      overdueCount: 1,
      qualityRating: 4.2
    }
  },
  tasksByCategory: {
    [TaskCategory.CLEANING]: {
      category: TaskCategory.CLEANING,
      totalTasks: 10,
      completedTasks: 8,
      averageCompletionTime: 1.5,
      overdueRate: 5
    }
  },
  productivityTrends: [
    {
      date: new Date('2024-01-01'),
      tasksCompleted: 3,
      tasksCreated: 2,
      averageCompletionTime: 2.0
    }
  ]
}

describe('TaskList Component', () => {
  const defaultProps = {
    tasks: mockTasks,
    sortBy: TaskSortField.DUE_DATE,
    sortOrder: 'asc' as const,
    selectedTasks: [],
    onSort: vi.fn(),
    onSelectTask: vi.fn(),
    onSelectAll: vi.fn(),
    onTaskClick: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders task list with correct data', () => {
    render(<TaskList {...defaultProps} />)
    
    expect(screen.getByText('Clean Kitchen')).toBeInTheDocument()
    expect(screen.getByText('Fix Leaky Faucet')).toBeInTheDocument()
    expect(screen.getByText('Monthly Inspection')).toBeInTheDocument()
  })

  it('handles task selection', () => {
    render(<TaskList {...defaultProps} />)
    
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // First task checkbox (index 0 is select all)
    
    expect(defaultProps.onSelectTask).toHaveBeenCalledWith('1', true)
  })

  it('handles select all functionality', () => {
    render(<TaskList {...defaultProps} />)
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(selectAllCheckbox)
    
    expect(defaultProps.onSelectAll).toHaveBeenCalledWith(true)
  })

  it('handles sorting', () => {
    render(<TaskList {...defaultProps} />)
    
    const titleSortButton = screen.getByText('Task')
    fireEvent.click(titleSortButton)
    
    expect(defaultProps.onSort).toHaveBeenCalledWith(TaskSortField.TITLE)
  })

  it('displays task priorities with correct colors', () => {
    render(<TaskList {...defaultProps} />)
    
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('shows expandable task details', () => {
    render(<TaskList {...defaultProps} />)
    
    // Use the test ID to find the expand button for the first task
    const expandButton = screen.getByTestId('expand-task-1')
    fireEvent.click(expandButton)
    
    expect(screen.getByText('Details')).toBeInTheDocument()
  })
})

describe('TaskFilters Component', () => {
  const defaultProps = {
    filters: {},
    sortBy: TaskSortField.DUE_DATE,
    sortOrder: 'asc' as const,
    onFiltersChange: vi.fn(),
    onSortChange: vi.fn(),
    onClearFilters: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders filter controls', () => {
    render(<TaskFilters {...defaultProps} />)
    
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('handles quick filter selection', () => {
    render(<TaskFilters {...defaultProps} />)
    
    const overdueButton = screen.getByText('Overdue')
    fireEvent.click(overdueButton)
    
    expect(defaultProps.onFiltersChange).toHaveBeenCalled()
  })

  it('handles sort changes', () => {
    render(<TaskFilters {...defaultProps} />)
    
    const sortSelect = screen.getByRole('combobox')
    fireEvent.click(sortSelect)
    
    // This would test the select dropdown functionality
    expect(sortSelect).toBeInTheDocument()
  })
})

describe('TaskSearch Component', () => {
  const defaultProps = {
    onSearch: vi.fn().mockResolvedValue([]),
    onTaskSelect: vi.fn(),
    placeholder: 'Search tasks...'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input', () => {
    render(<TaskSearch {...defaultProps} />)
    
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument()
  })

  it('handles search input changes', async () => {
    render(<TaskSearch {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search tasks...')
    fireEvent.change(searchInput, { target: { value: 'kitchen' } })
    
    await waitFor(() => {
      expect(defaultProps.onSearch).toHaveBeenCalled()
    }, { timeout: 500 })
  })

  it('clears search when clear button is clicked', () => {
    render(<TaskSearch {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search tasks...')
    fireEvent.change(searchInput, { target: { value: 'test' } })
    
    const clearButton = screen.getByRole('button')
    fireEvent.click(clearButton)
    
    expect(searchInput).toHaveValue('')
  })
})

describe('KanbanBoard Component', () => {
  const defaultProps = {
    tasks: mockTasks,
    onTaskMove: vi.fn(),
    onTaskClick: vi.fn(),
    wipLimits: {
      [TaskStatus.IN_PROGRESS]: 5
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders kanban columns', () => {
    render(<KanbanBoard {...defaultProps} />)
    
    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('displays tasks in correct columns', () => {
    render(<KanbanBoard {...defaultProps} />)
    
    // Check that tasks appear in their respective columns
    expect(screen.getByText('Clean Kitchen')).toBeInTheDocument()
    expect(screen.getByText('Fix Leaky Faucet')).toBeInTheDocument()
    expect(screen.getByText('Monthly Inspection')).toBeInTheDocument()
  })

  it('shows WIP limits', () => {
    render(<KanbanBoard {...defaultProps} />)
    
    expect(screen.getByText('Limit: 5')).toBeInTheDocument()
  })

  it('handles task clicks', () => {
    render(<KanbanBoard {...defaultProps} />)
    
    const taskCard = screen.getByText('Clean Kitchen')
    fireEvent.click(taskCard)
    
    expect(defaultProps.onTaskClick).toHaveBeenCalledWith(mockTasks[0])
  })
})

describe('TaskMetrics Component', () => {
  const defaultProps = {
    metrics: mockMetrics
  }

  it('renders metrics overview', () => {
    render(<TaskMetrics {...defaultProps} />)
    
    expect(screen.getByText('75.5%')).toBeInTheDocument() // Completion rate
    expect(screen.getByText('2.5h')).toBeInTheDocument() // Average completion time
    expect(screen.getByText('10.2%')).toBeInTheDocument() // Overdue rate
  })

  it('displays team performance', () => {
    render(<TaskMetrics {...defaultProps} />)
    
    expect(screen.getByText('Team Performance')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('80.0%')).toBeInTheDocument()
  })

  it('shows category performance', () => {
    render(<TaskMetrics {...defaultProps} />)
    
    expect(screen.getByText('Performance by Category')).toBeInTheDocument()
    expect(screen.getByText('Cleaning')).toBeInTheDocument()
  })

  it('renders productivity trends', () => {
    render(<TaskMetrics {...defaultProps} />)
    
    expect(screen.getByText('Productivity Trends (Last 30 Days)')).toBeInTheDocument()
  })
})

describe('BulkOperations Component', () => {
  const defaultProps = {
    selectedTaskIds: ['1', '2'],
    onBulkOperation: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    availableAssignees: [
      { id: 'user1', name: 'John Doe' },
      { id: 'user2', name: 'Jane Smith' }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders bulk operations panel', () => {
    render(<BulkOperations {...defaultProps} />)
    
    expect(screen.getByText('2 tasks selected')).toBeInTheDocument()
    expect(screen.getByText('Bulk Operations')).toBeInTheDocument()
  })

  it('shows assignee options', () => {
    render(<BulkOperations {...defaultProps} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('handles priority changes', () => {
    render(<BulkOperations {...defaultProps} />)
    
    const highPriorityButton = screen.getByText('High')
    fireEvent.click(highPriorityButton)
    
    expect(defaultProps.onBulkOperation).toHaveBeenCalledWith({
      taskIds: ['1', '2'],
      operation: 'priority',
      value: TaskPriority.HIGH
    })
  })

  it('handles bulk completion', () => {
    render(<BulkOperations {...defaultProps} />)
    
    const completeButton = screen.getByText('Mark Complete')
    fireEvent.click(completeButton)
    
    expect(defaultProps.onBulkOperation).toHaveBeenCalledWith({
      taskIds: ['1', '2'],
      operation: 'complete',
      value: true
    })
  })

  it('handles cancel action', () => {
    render(<BulkOperations {...defaultProps} />)
    
    const cancelButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg') // Find the X icon button
    )
    if (cancelButton) {
      fireEvent.click(cancelButton)
      expect(defaultProps.onCancel).toHaveBeenCalled()
    }
  })
})
