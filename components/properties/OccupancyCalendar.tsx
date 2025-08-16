'use client'

import { OccupancyRecord } from '@/lib/db/models/room'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users
} from 'lucide-react'
import { useState } from 'react'

interface OccupancyCalendarProps {
  roomId: string
  occupancyHistory: OccupancyRecord[]
  onUpdate: () => void
}

export function OccupancyCalendar({ roomId, occupancyHistory, onUpdate }: OccupancyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get the first day of the current month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  // Get the first day of the week for the calendar grid
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  // Get the last day of the week for the calendar grid
  const endDate = new Date(lastDayOfMonth)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

  // Generate calendar days
  const calendarDays = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    calendarDays.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // Check if a date has occupancy
  const getOccupancyForDate = (date: Date) => {
    return occupancyHistory.find(record => {
      const startDate = new Date(record.startDate)
      const endDate = record.endDate ? new Date(record.endDate) : new Date()
      
      return date >= startDate && date <= endDate
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Occupancy Calendar
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Calendar Grid */}
        <div className="space-y-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const occupancy = getOccupancyForDate(date)
              const isCurrentMonth = date.getMonth() === currentDate.getMonth()
              const isToday = date.toDateString() === new Date().toDateString()

              return (
                <div
                  key={index}
                  className={`
                    aspect-square p-1 border border-gray-200 rounded-lg text-center text-sm
                    ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : ''}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                    ${occupancy ? 'bg-blue-100' : ''}
                    hover:bg-gray-50 cursor-pointer transition-colors
                  `}
                >
                  <div className="h-full flex flex-col justify-between">
                    <span className={`${isToday ? 'font-bold' : ''}`}>
                      {date.getDate()}
                    </span>
                    
                    {occupancy && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full mx-auto"></div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-gray-200 rounded"></div>
              <span className="text-gray-600">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
              <span className="text-gray-600">Available</span>
            </div>
          </div>

          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Occupancy
          </Button>
        </div>

        {/* Current Occupancy Status */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
          
          {(() => {
            const currentOccupancy = occupancyHistory.find(record => 
              record.status === 'Current'
            )
            
            if (currentOccupancy) {
              return (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      Occupied by Tenant {currentOccupancy.tenantId}
                    </span>
                  </div>
                  <Badge variant="default">
                    ${currentOccupancy.monthlyRent.toLocaleString()}/month
                  </Badge>
                </div>
              )
            } else {
              return (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600">
                      Available for new tenant
                    </span>
                  </div>
                  <Badge variant="outline">
                    Available
                  </Badge>
                </div>
              )
            }
          })()}
        </div>

        {/* Upcoming Move-outs */}
        {(() => {
          const upcomingMoveOuts = occupancyHistory.filter(record => {
            if (!record.endDate || record.status !== 'Current') return false
            
            const endDate = new Date(record.endDate)
            const thirtyDaysFromNow = new Date()
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
            
            return endDate <= thirtyDaysFromNow && endDate >= new Date()
          })

          if (upcomingMoveOuts.length > 0) {
            return (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Upcoming Move-outs</h4>
                {upcomingMoveOuts.map(record => (
                  <div key={record.id} className="flex items-center justify-between text-sm">
                    <span className="text-yellow-700">
                      Tenant {record.tenantId}
                    </span>
                    <span className="text-yellow-700">
                      {record.endDate ? new Date(record.endDate).toLocaleDateString() : 'TBD'}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
          return null
        })()}
      </CardContent>
    </Card>
  )
}
