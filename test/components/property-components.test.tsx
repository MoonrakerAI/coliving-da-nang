import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

    it('should have links to details and settings pages', async () => {
      render(<PropertyCard property={mockProperty} onUpdate={() => {}} />)

      // Check for the main "View Details" button
      const viewDetailsButton = screen.getByRole('link', { name: /view details/i })
      expect(viewDetailsButton).toHaveAttribute('href', '/properties/prop-1')

      // Open the dropdown menu to find the "Edit Settings" link
      const menuTrigger = screen.getByRole('button', { name: /open menu/i })
      fireEvent.click(menuTrigger)

      const editSettingsLink = await screen.findByRole('menuitem', {
        name: /edit settings/i
      })
      expect(editSettingsLink.closest('a')).toHaveAttribute(
        'href',
        '/properties/prop-1/settings'
      )
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
      render(<RoomGrid rooms={mockRooms} propertyId="prop-1" onUpdate={() => {}} />)

      expect(screen.getByText('Room A101')).toBeInTheDocument()
      expect(screen.getByText('Room A102')).toBeInTheDocument()
      // Check for room type badges
      const roomCards = screen.getAllByRole('article')
      expect(within(roomCards[0]).getByText('Single')).toBeInTheDocument()
      expect(within(roomCards[1]).getByText('Double')).toBeInTheDocument()
    })

    it('should display room availability status', () => {
      render(<RoomGrid rooms={mockRooms} propertyId="prop-1" onUpdate={() => {}} />)

      const roomCards = screen.getAllByRole('article')
      const availableRoom = within(roomCards[0])
      const occupiedRoom = within(roomCards[1])

      expect(availableRoom.getByText('Available')).toBeInTheDocument()
      expect(occupiedRoom.getByText('Occupied')).toBeInTheDocument()
    })

    it('should show room details correctly', () => {
      render(<RoomGrid rooms={mockRooms} propertyId="prop-1" onUpdate={() => {}} />)

      expect(screen.getByText('$800')).toBeInTheDocument()
      expect(screen.getByText('$1,000')).toBeInTheDocument()
      expect(screen.getByText('250 sq ft')).toBeInTheDocument()
      expect(screen.getByText('300 sq ft')).toBeInTheDocument()
    })

    it('should handle empty room list', () => {
      render(<RoomGrid rooms={[]} propertyId="prop-1" onUpdate={() => {}} />)

      expect(screen.getByText('No Rooms Yet')).toBeInTheDocument()
    })
  })

  describe('OccupancyCalendar', () => {
    const mockOccupancyData = [
      {
        id: 'occupancy-1',
        roomId: 'room-1',
        propertyId: 'prop-1',
        tenantId: 'tenant-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        monthlyRent: 800,
        status: 'Past' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'occupancy-2',
        roomId: 'room-1',
        propertyId: 'prop-1',
        tenantId: 'tenant-2',
        startDate: new Date('2024-07-01'),
        endDate: undefined,
        monthlyRent: 850,
        status: 'Current' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    it('should display current occupancy correctly', () => {
      render(
        <OccupancyCalendar
          occupancyHistory={mockOccupancyData}
          roomId="room-1"
          onUpdate={() => {}}
        />
      )

      const currentOccupancy = screen.getByTestId('occupancy-current')
      expect(currentOccupancy).toHaveTextContent('Occupied by Tenant tenant-2')
      expect(currentOccupancy).toHaveTextContent('$850/month')
    })

    it('should show available when no current tenants', () => {
      render(
        <OccupancyCalendar
          occupancyHistory={mockOccupancyData.filter(o => o.status === 'Past')}
          roomId="room-1"
          onUpdate={() => {}}
        />
      )

      const pastOccupancy = screen.getByTestId('occupancy-past')
      expect(pastOccupancy).toHaveTextContent('Available for new tenant')
    })

    it('should handle empty occupancy data', () => {
      render(
        <OccupancyCalendar
          occupancyHistory={[]}
          roomId="room-1"
          onUpdate={() => {}}
        />
      )

      expect(screen.getByText('Available for new tenant')).toBeInTheDocument()
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
        updatedAt: new Date(),
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
        updatedAt: new Date(),
      },
    ]

    it('should render maintenance records list', () => {
      render(<MaintenanceTracker maintenanceRecords={mockMaintenanceRecords} roomId="room-1" propertyId="prop-1" onUpdate={() => {}}/>)

      expect(screen.getByText('Fix leaky faucet')).toBeInTheDocument()
      expect(screen.getByText('Replace light bulb')).toBeInTheDocument()
      expect(screen.getByText('Bathroom faucet is dripping')).toBeInTheDocument()
    })

    it('should display priority badges correctly', () => {
      render(<MaintenanceTracker maintenanceRecords={mockMaintenanceRecords} roomId="room-1" propertyId="prop-1" onUpdate={() => {}}/>)

      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('Low')).toBeInTheDocument()
    })

    it('should show status badges', () => {
      render(<MaintenanceTracker maintenanceRecords={mockMaintenanceRecords} roomId="room-1" propertyId="prop-1" onUpdate={() => {}}/>)

      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('should display costs when available', () => {
      render(<MaintenanceTracker maintenanceRecords={mockMaintenanceRecords} roomId="room-1" propertyId="prop-1" onUpdate={() => {}}/>)

      expect(screen.getByText('$150.00')).toBeInTheDocument()
      expect(screen.getByText('$25.00')).toBeInTheDocument()
    })

    it('should handle empty maintenance records', () => {
      render(<MaintenanceTracker maintenanceRecords={[]} onUpdate={() => {}} roomId="room-1" propertyId="prop-1" />);

      expect(screen.getByText('No maintenance records yet')).toBeInTheDocument()
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

    it('should render property settings overview', () => {
      render(<PropertySettings property={mockProperty} />)

      expect(screen.getByText('Property Settings')).toBeInTheDocument()
      expect(screen.getByText('Max Occupancy')).toBeInTheDocument()
      expect(screen.getByText('10 people')).toBeInTheDocument()
      expect(screen.getByText('Check-in/out')).toBeInTheDocument()
      expect(screen.getByText('15:00 - 11:00')).toBeInTheDocument()
    })

    it('should render amenities and policies correctly', () => {
      render(<PropertySettings property={mockProperty} />)

      expect(screen.getByText('Pets Allowed')).toBeInTheDocument()
      expect(screen.getByText('No Smoking')).toBeInTheDocument()
      expect(screen.getByText('Parking Available')).toBeInTheDocument()
      expect(screen.getByText('WiFi Available')).toBeInTheDocument()
    })

    it('should render house rules', () => {
      render(<PropertySettings property={mockProperty} />)

      expect(screen.getByText('House Rules')).toBeInTheDocument()
      expect(screen.getByText('No smoking')).toBeInTheDocument()
      expect(screen.getByText('Quiet hours 10pm-7am')).toBeInTheDocument()
    })

    it('should render wifi information if password exists', () => {
      render(<PropertySettings property={mockProperty} />)

      expect(screen.getByText('WiFi Information')).toBeInTheDocument()
      expect(screen.getByText('password123')).toBeInTheDocument()
    })

    it('should not render house rules if none are provided', () => {
      const propertyWithoutRules = { ...mockProperty, houseRules: [] }
      render(<PropertySettings property={propertyWithoutRules} />)

      expect(screen.queryByText('House Rules')).not.toBeInTheDocument()
    })

    it('should have a link to the edit settings page', () => {
      render(<PropertySettings property={mockProperty} />)

      const editLink = screen.getByRole('link', { name: /edit settings/i })
      expect(editLink).toHaveAttribute('href', '/properties/property-1/settings')
    })
  })
})
