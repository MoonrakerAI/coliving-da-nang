import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PropertyCard } from '../../components/properties/PropertyCard'
import { RoomGrid } from '../../components/properties/RoomGrid'
import { OccupancyCalendar } from '../../components/properties/OccupancyCalendar'
import { PropertySettings } from '../../components/properties/PropertySettings'
import { MaintenanceTracker } from '../../components/properties/MaintenanceTracker'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/properties',
}))

// Mock fetch
global.fetch = vi.fn()

describe('Property Management Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockClear()
  })

  describe('PropertyCard', () => {
    const mockProperty = {
      id: 'property-1',
      name: 'Sunset Villa',
      address: {
        street: '123 Main St',
        city: 'Da Nang',
        state: 'Central Vietnam',
        postalCode: '550000',
        country: 'Vietnam'
      },
      roomCount: 5,
      settings: {
        allowPets: true,
        smokingAllowed: false,
        maxOccupancy: 10,
        checkInTime: '15:00',
        checkOutTime: '11:00',
        wifiPassword: 'password123',
        parkingAvailable: true
      },
      houseRules: ['No smoking', 'Quiet hours 10pm-7am'],
      ownerId: 'owner-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const mockOnUpdate = vi.fn()

    it('should render property information correctly', () => {
      render(<PropertyCard property={mockProperty} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('Sunset Villa')).toBeInTheDocument()
      expect(screen.getByText('Da Nang, Central Vietnam')).toBeInTheDocument()
      expect(screen.getByText('123 Main St')).toBeInTheDocument()
      expect(screen.getByText('5 rooms')).toBeInTheDocument()
      expect(screen.getByText('Max: 10')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('should display property features correctly', () => {
      render(<PropertyCard property={mockProperty} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('Pet Friendly')).toBeInTheDocument()
      expect(screen.getByText('Parking')).toBeInTheDocument()
      expect(screen.getByText('No Smoking')).toBeInTheDocument()
    })

    it('should show inactive status for inactive properties', () => {
      const inactiveProperty = { ...mockProperty, isActive: false }
      render(<PropertyCard property={inactiveProperty} onUpdate={mockOnUpdate} />)

      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('should handle property status toggle', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      render(<PropertyCard property={mockProperty} onUpdate={mockOnUpdate} />)

      // Open dropdown menu
      const menuButton = screen.getByRole('button', { name: /more/i })
      fireEvent.click(menuButton)

      // Click deactivate option
      const deactivateButton = screen.getByText('Deactivate')
      fireEvent.click(deactivateButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/properties/property-1', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isActive: false
          })
        })
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<PropertyCard property={mockProperty} onUpdate={mockOnUpdate} />)

      // Open dropdown menu and click deactivate
      const menuButton = screen.getByRole('button', { name: /more/i })
      fireEvent.click(menuButton)
      const deactivateButton = screen.getByText('Deactivate')
      fireEvent.click(deactivateButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error updating property status:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('should render action buttons with correct links', () => {
      render(<PropertyCard property={mockProperty} onUpdate={mockOnUpdate} />)

      expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute('href', '/properties/property-1')
      expect(screen.getByRole('link', { name: /edit settings/i })).toHaveAttribute('href', '/properties/property-1/settings')
    })
  })

  describe('RoomGrid', () => {
    const mockRooms = [
      {
        id: 'room-1',
        propertyId: 'property-1',
        number: 'A101',
        type: 'Single' as const,
        size: 250,
        monthlyRent: 800,
        deposit: 1600,
        isAvailable: true,
        condition: 'Good' as const,
        features: ['Air Conditioning'],
        photos: ['photo1.jpg'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'room-2',
        propertyId: 'property-1',
        number: 'A102',
        type: 'Double' as const,
        size: 300,
        monthlyRent: 1000,
        deposit: 2000,
        isAvailable: false,
        condition: 'Excellent' as const,
        features: ['Air Conditioning', 'Balcony'],
        photos: ['photo2.jpg'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    it('should render all rooms in grid format', () => {
      render(<RoomGrid rooms={mockRooms} />)

      expect(screen.getByText('A101')).toBeInTheDocument()
      expect(screen.getByText('A102')).toBeInTheDocument()
      expect(screen.getByText('Single')).toBeInTheDocument()
      expect(screen.getByText('Double')).toBeInTheDocument()
    })

    it('should display room availability status', () => {
      render(<RoomGrid rooms={mockRooms} />)

      expect(screen.getByText('Available')).toBeInTheDocument()
      expect(screen.getByText('Occupied')).toBeInTheDocument()
    })

    it('should show room details correctly', () => {
      render(<RoomGrid rooms={mockRooms} />)

      expect(screen.getByText('$800/month')).toBeInTheDocument()
      expect(screen.getByText('$1000/month')).toBeInTheDocument()
      expect(screen.getByText('250 sq ft')).toBeInTheDocument()
      expect(screen.getByText('300 sq ft')).toBeInTheDocument()
    })

    it('should handle empty room list', () => {
      render(<RoomGrid rooms={[]} />)

      expect(screen.getByText('No rooms found')).toBeInTheDocument()
    })
  })

  describe('OccupancyCalendar', () => {
    const mockOccupancyData = [
      {
        id: 'occupancy-1',
        roomId: 'room-1',
        tenantId: 'tenant-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        monthlyRent: 800,
        status: 'Past' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'occupancy-2',
        roomId: 'room-1',
        tenantId: 'tenant-2',
        startDate: new Date('2024-07-01'),
        endDate: undefined,
        monthlyRent: 850,
        status: 'Current' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    it('should render calendar with occupancy periods', () => {
      render(<OccupancyCalendar occupancyData={mockOccupancyData} />)

      expect(screen.getByText('Occupancy Calendar')).toBeInTheDocument()
      // Calendar should show months and occupancy periods
      expect(screen.getByText('January 2024')).toBeInTheDocument()
      expect(screen.getByText('July 2024')).toBeInTheDocument()
    })

    it('should highlight current occupancy', () => {
      render(<OccupancyCalendar occupancyData={mockOccupancyData} />)

      const currentOccupancy = screen.getByTestId('occupancy-current')
      expect(currentOccupancy).toHaveClass('bg-green-200')
    })

    it('should show past occupancy differently', () => {
      render(<OccupancyCalendar occupancyData={mockOccupancyData} />)

      const pastOccupancy = screen.getByTestId('occupancy-past')
      expect(pastOccupancy).toHaveClass('bg-gray-200')
    })

    it('should handle empty occupancy data', () => {
      render(<OccupancyCalendar occupancyData={[]} />)

      expect(screen.getByText('No occupancy data available')).toBeInTheDocument()
    })
  })

  describe('MaintenanceTracker', () => {
    const mockMaintenanceRecords = [
      {
        id: 'maintenance-1',
        roomId: 'room-1',
        propertyId: 'property-1',
        title: 'Fix leaky faucet',
        description: 'Bathroom faucet is dripping',
        priority: 'High' as const,
        status: 'Pending' as const,
        reportedDate: new Date('2024-01-15'),
        cost: 150,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'maintenance-2',
        roomId: 'room-2',
        propertyId: 'property-1',
        title: 'Replace light bulb',
        description: 'Living room light not working',
        priority: 'Low' as const,
        status: 'Completed' as const,
        reportedDate: new Date('2024-01-10'),
        completedDate: new Date('2024-01-12'),
        cost: 25,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    it('should render maintenance records list', () => {
      render(<MaintenanceTracker records={mockMaintenanceRecords} />)

      expect(screen.getByText('Fix leaky faucet')).toBeInTheDocument()
      expect(screen.getByText('Replace light bulb')).toBeInTheDocument()
      expect(screen.getByText('Bathroom faucet is dripping')).toBeInTheDocument()
    })

    it('should display priority badges correctly', () => {
      render(<MaintenanceTracker records={mockMaintenanceRecords} />)

      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('Low')).toBeInTheDocument()
    })

    it('should show status badges', () => {
      render(<MaintenanceTracker records={mockMaintenanceRecords} />)

      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('should display costs when available', () => {
      render(<MaintenanceTracker records={mockMaintenanceRecords} />)

      expect(screen.getByText('$150')).toBeInTheDocument()
      expect(screen.getByText('$25')).toBeInTheDocument()
    })

    it('should handle empty maintenance records', () => {
      render(<MaintenanceTracker records={[]} />)

      expect(screen.getByText('No maintenance records found')).toBeInTheDocument()
    })

    it('should allow filtering by status', () => {
      render(<MaintenanceTracker records={mockMaintenanceRecords} />)

      const statusFilter = screen.getByRole('combobox', { name: /filter by status/i })
      fireEvent.change(statusFilter, { target: { value: 'Pending' } })

      expect(screen.getByText('Fix leaky faucet')).toBeInTheDocument()
      expect(screen.queryByText('Replace light bulb')).not.toBeInTheDocument()
    })
  })

  describe('PropertySettings', () => {
    const mockProperty = {
      id: 'property-1',
      name: 'Sunset Villa',
      address: {
        street: '123 Main St',
        city: 'Da Nang',
        state: 'Central Vietnam',
        postalCode: '550000',
        country: 'Vietnam'
      },
      roomCount: 5,
      settings: {
        allowPets: true,
        smokingAllowed: false,
        maxOccupancy: 10,
        checkInTime: '15:00',
        checkOutTime: '11:00',
        wifiPassword: 'password123',
        parkingAvailable: true
      },
      houseRules: ['No smoking', 'Quiet hours 10pm-7am'],
      ownerId: 'owner-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const mockOnUpdate = vi.fn()

    it('should render property settings form', () => {
      render(<PropertySettings property={mockProperty} onUpdate={mockOnUpdate} />)

      expect(screen.getByDisplayValue('Sunset Villa')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()
      expect(screen.getByDisplayValue('15:00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('11:00')).toBeInTheDocument()
    })

    it('should show correct checkbox states', () => {
      render(<PropertySettings property={mockProperty} onUpdate={mockOnUpdate} />)

      expect(screen.getByRole('checkbox', { name: /allow pets/i })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: /smoking allowed/i })).not.toBeChecked()
      expect(screen.getByRole('checkbox', { name: /parking available/i })).toBeChecked()
    })

    it('should handle form submission', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      render(<PropertySettings property={mockProperty} onUpdate={mockOnUpdate} />)

      const nameInput = screen.getByDisplayValue('Sunset Villa')
      fireEvent.change(nameInput, { target: { value: 'Updated Villa Name' } })

      const submitButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/properties/property-1', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Updated Villa Name')
        })
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('should validate required fields', async () => {
      render(<PropertySettings property={mockProperty} onUpdate={mockOnUpdate} />)

      const nameInput = screen.getByDisplayValue('Sunset Villa')
      fireEvent.change(nameInput, { target: { value: '' } })

      const submitButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Property name is required')).toBeInTheDocument()
      })
    })

    it('should handle house rules management', () => {
      render(<PropertySettings property={mockProperty} onUpdate={mockOnUpdate} />)

      expect(screen.getByDisplayValue('No smoking')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Quiet hours 10pm-7am')).toBeInTheDocument()

      const addRuleButton = screen.getByRole('button', { name: /add rule/i })
      fireEvent.click(addRuleButton)

      const newRuleInputs = screen.getAllByPlaceholderText('Enter house rule')
      expect(newRuleInputs).toHaveLength(3) // 2 existing + 1 new
    })
  })
})
