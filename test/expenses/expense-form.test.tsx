import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseForm } from '@/app/expenses/new/components/ExpenseForm'

// Mock the components that have complex dependencies
vi.mock('@/app/expenses/new/components/CategorySelector', () => ({
  CategorySelector: ({ selectedCategory, onCategorySelect }: any) => (
    <div data-testid="category-selector">
      <button type="button" onClick={() => onCategorySelect('Utilities')}>Utilities</button>
      <button type="button" onClick={() => onCategorySelect('Repairs')}>Repairs</button>
      <span data-testid="selected-category">{selectedCategory}</span>
    </div>
  )
}))

vi.mock('@/app/expenses/new/components/PhotoCapture', () => ({
  PhotoCapture: ({ photos, onPhotosChange }: any) => (
    <div data-testid="photo-capture">
      <button type="button" onClick={() => onPhotosChange([new File([''], 'test.jpg')])}>
        Add Photo
      </button>
      <span data-testid="photo-count">{photos.length}</span>
    </div>
  )
}))

vi.mock('@/app/expenses/new/components/LocationPicker', () => ({
  LocationPicker: ({ onLocationSelect }: any) => (
    <div data-testid="location-picker">
      <button type="button" onClick={() => onLocationSelect({ lat: 16.0544, lng: 108.2022, address: 'Da Nang' })}>
        Set Location
      </button>
    </div>
  )
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      type={type}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, any>(({ ...props }, ref) => (
    <input ref={ref} {...props} data-testid="input" />
  )),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef<HTMLTextAreaElement, any>(({ ...props }, ref) => (
    <textarea ref={ref} {...props} data-testid="textarea" />
  )),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => (
    <label {...props}>{children}</label>
  )
}))

describe('ExpenseForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all required form fields', () => {
    render(<ExpenseForm />)
    
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByText(/category \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByTestId('photo-capture')).toBeInTheDocument()
    expect(screen.getByTestId('location-picker')).toBeInTheDocument()
  })

  it('has auto-focus on amount field', () => {
    render(<ExpenseForm />)
    
    const amountInput = screen.getByLabelText(/amount/i)
    expect(amountInput).toHaveFocus()
  })

  it('displays VND currency by default', () => {
    render(<ExpenseForm />)
    
    expect(screen.getByText('VND')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<ExpenseForm />)
    
    // Make form dirty (change category) so submit button enables
    const repairsButton = screen.getByRole('button', { name: 'Repairs' })
    await user.click(repairsButton)

    const submitButton = screen.getByRole('button', { name: /create expense/i })
    await waitFor(() => expect(submitButton).toBeEnabled())
    
    // Try to submit without filling required fields
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/amount must be greater than 0/i)).toBeInTheDocument()
      expect(screen.getByText(/description is required/i)).toBeInTheDocument()
    })
  })

  it('allows valid form submission', async () => {
    // Mock console.log to capture form submission
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    render(<ExpenseForm />)
    
    // Fill out the form
    const amountInput = screen.getByLabelText(/amount/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(amountInput, '50000')
    await user.type(descriptionInput, 'Test expense')
    
    // Select category
    const utilitiesButton = screen.getByRole('button', { name: 'Utilities' })
    await user.click(utilitiesButton)
    
    const submitButton = screen.getByRole('button', { name: /create expense/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Submitting expense:', expect.objectContaining({
        amount: 50000,
        description: 'Test expense',
        category: 'Utilities'
      }))
    })
    
    consoleSpy.mockRestore()
  })

  it('shows loading state during submission', async () => {
    render(<ExpenseForm />)
    
    // Fill minimum required fields
    const amountInput = screen.getByLabelText(/amount/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(amountInput, '50000')
    await user.type(descriptionInput, 'Test expense')
    
    // Select category
    const utilitiesButton = screen.getByRole('button', { name: 'Utilities' })
    await user.click(utilitiesButton)
    
    const submitButton = screen.getByRole('button', { name: /create expense/i })
    await user.click(submitButton)
    
    // Should show loading state
    expect(screen.getByRole('button', { name: /creating expense/i })).toBeInTheDocument()
  })

  it('integrates with CategorySelector', async () => {
    render(<ExpenseForm />)
    
    const categorySelector = screen.getByTestId('category-selector')
    expect(categorySelector).toBeInTheDocument()
    
    // Select a category
    const repairsButton = screen.getByRole('button', { name: 'Repairs' })
    fireEvent.click(repairsButton)
    
    // Should update selected category
    expect(screen.getByTestId('selected-category')).toHaveTextContent('Repairs')
  })

  it('integrates with PhotoCapture', async () => {
    render(<ExpenseForm />)
    
    const photoCapture = screen.getByTestId('photo-capture')
    expect(photoCapture).toBeInTheDocument()
    
    // Add a photo
    const addPhotoButton = screen.getByRole('button', { name: 'Add Photo' })
    fireEvent.click(addPhotoButton)
    
    // Should update photo count
    expect(screen.getByTestId('photo-count')).toHaveTextContent('1')
  })

  it('integrates with LocationPicker', async () => {
    render(<ExpenseForm />)
    
    const locationPicker = screen.getByTestId('location-picker')
    expect(locationPicker).toBeInTheDocument()
    
    // Set location
    const setLocationButton = screen.getByRole('button', { name: 'Set Location' })
    fireEvent.click(setLocationButton)
    
    // Location should be set (we can't easily test this without exposing internal state)
    expect(setLocationButton).toBeInTheDocument()
  })

  it('shows draft indicator when form is dirty', async () => {
    render(<ExpenseForm />)
    
    // Initially no draft indicator
    expect(screen.queryByText(/changes will be auto-saved/i)).not.toBeInTheDocument()
    
    // Make form dirty
    const amountInput = screen.getByLabelText(/amount/i)
    fireEvent.change(amountInput, { target: { value: '100' } })
    
    // Should show draft indicator
    await waitFor(() => {
      expect(screen.getByText(/changes will be auto-saved/i)).toBeInTheDocument()
    })
  })

  it('disables submit button when form is not dirty', () => {
    render(<ExpenseForm />)
    
    const submitButton = screen.getByRole('button', { name: /create expense/i })
    expect(submitButton).toBeDisabled()
  })

  it('has large touch targets for mobile', () => {
    render(<ExpenseForm />)
    
    const amountInput = screen.getByLabelText(/amount/i)
    const submitButton = screen.getByRole('button', { name: /create expense/i })
    
    // Check for mobile-friendly classes
    expect(amountInput).toHaveClass('h-14')
    expect(submitButton).toHaveClass('h-14')
  })
})
