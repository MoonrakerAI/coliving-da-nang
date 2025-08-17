import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskCompletion } from '@/components/tasks/TaskCompletion'
import { Task, TaskCategory, TaskPriority, TaskStatus } from '@/types'

const mockTask: Task = {
  id: 'task123',
  propertyId: 'prop123',
  title: 'Clean Kitchen',
  description: 'Deep clean the kitchen area',
  instructions: 'Use cleaning supplies from storage',
  category: TaskCategory.CLEANING,
  priority: TaskPriority.MEDIUM,
  assignedTo: ['user123'],
  createdBy: 'user123',
  status: TaskStatus.PENDING,
  completionPhotos: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  dueDate: new Date('2024-01-15'),
  estimatedDuration: 30
}

const mockUsers = [
  { id: 'user123', name: 'John Doe', email: 'john@example.com' },
  { id: 'user456', name: 'Jane Smith', email: 'jane@example.com' }
]

describe('TaskCard', () => {
  it('renders task information correctly', () => {
    render(
      <TaskCard 
        task={mockTask}
        onComplete={vi.fn()}
        onEdit={vi.fn()}
        onView={vi.fn()}
      />
    )

    expect(screen.getByText('Clean Kitchen')).toBeInTheDocument()
    expect(screen.getByText('Deep clean the kitchen area')).toBeInTheDocument()
    expect(screen.getByText('Cleaning')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
  })

  it('shows overdue styling for past due tasks', () => {
    const overdueTask = {
      ...mockTask,
      dueDate: new Date('2023-12-01'), // Past date
      status: TaskStatus.PENDING
    }

    render(<TaskCard task={overdueTask} />)
    
    const card = screen.getByText('Clean Kitchen').closest('div')
    expect(card).toHaveClass('border-red-200')
  })

  it('calls onComplete when complete button is clicked', () => {
    const onComplete = vi.fn()
    
    render(
      <TaskCard 
        task={mockTask}
        onComplete={onComplete}
      />
    )

    fireEvent.click(screen.getByText('Mark Complete'))
    expect(onComplete).toHaveBeenCalledWith('task123')
  })

  it('shows completion info for completed tasks', () => {
    const completedTask = {
      ...mockTask,
      status: TaskStatus.COMPLETED,
      completedAt: new Date('2024-01-10'),
      completionNotes: 'Task completed successfully',
      qualityRating: 5
    }

    render(<TaskCard task={completedTask} />)

    expect(screen.getByText(/Completed/)).toBeInTheDocument()
    expect(screen.getByText('Task completed successfully')).toBeInTheDocument()
    expect(screen.getByText('5/5')).toBeInTheDocument()
  })

  it('shows recurrence info for recurring tasks', () => {
    const recurringTask = {
      ...mockTask,
      recurrence: {
        type: 'weekly' as const,
        interval: 1,
        assignmentRotation: false
      }
    }

    render(<TaskCard task={recurringTask} />)

    expect(screen.getByText(/Recurring: weekly/)).toBeInTheDocument()
  })
})

describe('TaskForm', () => {
  it('renders form fields correctly', () => {
    render(
      <TaskForm 
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        availableUsers={mockUsers}
      />
    )

    expect(screen.getByLabelText(/Task Title/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Priority/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Assign To/)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const onSubmit = vi.fn()
    
    render(
      <TaskForm 
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        availableUsers={mockUsers}
      />
    )

    fireEvent.click(screen.getByText('Create Task'))

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const onSubmit = vi.fn()
    
    render(
      <TaskForm 
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        availableUsers={mockUsers}
      />
    )

    fireEvent.change(screen.getByLabelText(/Task Title/), {
      target: { value: 'Test Task' }
    })
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'Test Description' }
    })
    
    // Select a user
    const userCheckbox = screen.getByRole('checkbox', { name: /John Doe/ })
    fireEvent.click(userCheckbox)

    fireEvent.click(screen.getByText('Create Task'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          description: 'Test Description',
          assignedTo: ['user123']
        })
      )
    })
  })

  it('shows recurrence options when enabled', () => {
    render(
      <TaskForm 
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        availableUsers={mockUsers}
      />
    )

    const recurrenceCheckbox = screen.getByLabelText(/Make this a recurring task/)
    fireEvent.click(recurrenceCheckbox)

    expect(screen.getByText('Recurrence Type')).toBeInTheDocument()
    expect(screen.getByText('Every')).toBeInTheDocument()
  })

  it('pre-fills form when editing existing task', () => {
    render(
      <TaskForm 
        task={mockTask}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        availableUsers={mockUsers}
      />
    )

    expect(screen.getByDisplayValue('Clean Kitchen')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Deep clean the kitchen area')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Cleaning')).toBeInTheDocument()
  })
})

describe('TaskCompletion', () => {
  it('renders completion form correctly', () => {
    render(
      <TaskCompletion
        taskId="task123"
        taskTitle="Clean Kitchen"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText('Complete Task')).toBeInTheDocument()
    expect(screen.getByText('Clean Kitchen')).toBeInTheDocument()
    expect(screen.getByLabelText(/Completion Notes/)).toBeInTheDocument()
    expect(screen.getByText(/Completion Photos/)).toBeInTheDocument()
    expect(screen.getByText(/Quality Rating/)).toBeInTheDocument()
  })

  it('allows rating selection', () => {
    render(
      <TaskCompletion
        taskId="task123"
        taskTitle="Clean Kitchen"
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')?.classList.contains('w-6')
    )
    
    fireEvent.click(stars[3]) // Click 4th star (4/5 rating)
    
    expect(screen.getByText('4/5')).toBeInTheDocument()
  })

  it('calls onComplete with form data', async () => {
    const onComplete = vi.fn()
    
    render(
      <TaskCompletion
        taskId="task123"
        taskTitle="Clean Kitchen"
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText(/Completion Notes/), {
      target: { value: 'Task completed well' }
    })

    // Click 5th star for rating
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')?.classList.contains('w-6')
    )
    fireEvent.click(stars[4])

    fireEvent.click(screen.getByText('Complete Task'))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({
        completionNotes: 'Task completed well',
        completionPhotos: [],
        qualityRating: 5
      })
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    
    render(
      <TaskCompletion
        taskId="task123"
        taskTitle="Clean Kitchen"
        onComplete={vi.fn()}
        onCancel={onCancel}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
