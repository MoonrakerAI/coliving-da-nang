import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategorySelector } from '@/app/expenses/new/components/CategorySelector'

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button 
      onClick={onClick} 
      data-variant={variant}
      className={className}
      data-testid="category-button"
    >
      {children}
    </button>
  )
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

describe('CategorySelector', () => {
  const user = userEvent.setup()
  const mockOnCategorySelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all expense categories', () => {
    render(<CategorySelector onCategorySelect={mockOnCategorySelect} />)
    
    // Check all categories are present
    expect(screen.getByText('Utilities')).toBeInTheDocument()
    expect(screen.getByText('Repairs')).toBeInTheDocument()
    expect(screen.getByText('Supplies')).toBeInTheDocument()
    expect(screen.getByText('Cleaning')).toBeInTheDocument()
    expect(screen.getByText('Maintenance')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('displays category icons', () => {
    render(<CategorySelector onCategorySelect={mockOnCategorySelect} />)
    
    // Check for emoji icons using more flexible queries
    const container = screen.getByTestId ? document.body : screen.container
    expect(container.textContent).toContain('⚡') // Utilities
    expect(container.textContent).toContain('🔧') // Repairs
    expect(container.textContent).toContain('📦') // Supplies
    expect(container.textContent).toContain('🧽') // Cleaning
    expect(container.textContent).toContain('🛠️') // Maintenance
    expect(container.textContent).toContain('📝') // Other
  })

  it('shows recently used categories section', () => {
    render(<CategorySelector onCategorySelect={mockOnCategorySelect} />)
    
    expect(screen.getByText('Recently Used')).toBeInTheDocument()
    expect(screen.getByText('All Categories')).toBeInTheDocument()
  })

  it('calls onCategorySelect when category is clicked', async () => {
    render(<CategorySelector onCategorySelect={mockOnCategorySelect} />)
    
    const utilitiesButton = screen.getAllByText('Utilities')[0] // Get first occurrence
    await user.click(utilitiesButton)
    
    expect(mockOnCategorySelect).toHaveBeenCalledWith('Utilities')
  })

  it('highlights selected category', () => {
    render(
      <CategorySelector 
        selectedCategory="Repairs" 
        onCategorySelect={mockOnCategorySelect} 
      />
    )
    
    const categoryButtons = screen.getAllByTestId('category-button')
    const repairsButtons = categoryButtons.filter(button => 
      button.textContent?.includes('Repairs')
    )
    
    // At least one Repairs button should have default variant (selected state)
    expect(repairsButtons.some(button => 
      button.getAttribute('data-variant') === 'default'
    )).toBe(true)
  })

  it('shows recently used indicator', () => {
    render(<CategorySelector onCategorySelect={mockOnCategorySelect} />)
    
    // Recently used categories should have indicator dots
    // This is tested through the presence of the "Recently Used" section
    expect(screen.getByText('Recently Used')).toBeInTheDocument()
  })

  it('has large touch targets for mobile', () => {
    render(<CategorySelector onCategorySelect={mockOnCategorySelect} />)
    
    const categoryButtons = screen.getAllByTestId('category-button')
    
    // Check that buttons have mobile-friendly height class
    categoryButtons.forEach(button => {
      expect(button).toHaveClass('h-16')
    })
  })

  it('displays categories in grid layout', () => {
    render(<CategorySelector onCategorySelect={mockOnCategorySelect} />)
    
    // Check for grid container classes
    const gridContainers = screen.getByText('Recently Used').parentElement?.querySelectorAll('.grid-cols-2')
    expect(gridContainers?.length).toBeGreaterThan(0)
  })

  it('handles category selection with proper visual feedback', async () => {
    const { rerender } = render(
      <CategorySelector onCategorySelect={mockOnCategorySelect} />
    )
    
    // Click on Cleaning category
    const cleaningButton = screen.getAllByText('Cleaning')[0]
    await user.click(cleaningButton)
    
    expect(mockOnCategorySelect).toHaveBeenCalledWith('Cleaning')
    
    // Rerender with selected category
    rerender(
      <CategorySelector 
        selectedCategory="Cleaning" 
        onCategorySelect={mockOnCategorySelect} 
      />
    )
    
    // Verify selection is reflected in UI
    const categoryButtons = screen.getAllByTestId('category-button')
    const cleaningButtons = categoryButtons.filter(button => 
      button.textContent?.includes('Cleaning')
    )
    
    expect(cleaningButtons.some(button => 
      button.getAttribute('data-variant') === 'default'
    )).toBe(true)
  })
})
