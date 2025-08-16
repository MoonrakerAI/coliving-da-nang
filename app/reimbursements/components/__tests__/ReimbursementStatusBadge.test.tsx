import { render, screen } from '@testing-library/react'
import { ReimbursementStatusBadge } from '../ReimbursementStatusBadge'

describe('ReimbursementStatusBadge', () => {
  it('should render Requested status correctly', () => {
    render(<ReimbursementStatusBadge status="Requested" />)
    
    expect(screen.getByText('Requested')).toBeInTheDocument()
    const badge = screen.getByText('Requested').closest('div')
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('should render Approved status correctly', () => {
    render(<ReimbursementStatusBadge status="Approved" />)
    
    expect(screen.getByText('Approved')).toBeInTheDocument()
    const badge = screen.getByText('Approved').closest('div')
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('should render Paid status correctly', () => {
    render(<ReimbursementStatusBadge status="Paid" />)
    
    expect(screen.getByText('Paid')).toBeInTheDocument()
    const badge = screen.getByText('Paid').closest('div')
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('should render Denied status correctly', () => {
    render(<ReimbursementStatusBadge status="Denied" />)
    
    expect(screen.getByText('Denied')).toBeInTheDocument()
    const badge = screen.getByText('Denied').closest('div')
    expect(badge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('should apply custom className', () => {
    render(<ReimbursementStatusBadge status="Requested" className="custom-class" />)
    
    const badge = screen.getByText('Requested').closest('div')
    expect(badge).toHaveClass('custom-class')
  })

  it('should render with correct icons', () => {
    const { rerender } = render(<ReimbursementStatusBadge status="Requested" />)
    expect(screen.getByText('Requested').parentElement).toContainHTML('svg')

    rerender(<ReimbursementStatusBadge status="Approved" />)
    expect(screen.getByText('Approved').parentElement).toContainHTML('svg')

    rerender(<ReimbursementStatusBadge status="Paid" />)
    expect(screen.getByText('Paid').parentElement).toContainHTML('svg')

    rerender(<ReimbursementStatusBadge status="Denied" />)
    expect(screen.getByText('Denied').parentElement).toContainHTML('svg')
  })
})
