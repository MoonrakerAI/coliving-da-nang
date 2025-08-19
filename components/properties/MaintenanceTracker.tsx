'use client'

import { useState } from 'react'
import { MaintenanceRecord } from '@/lib/db/models/room'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Settings,
  Plus,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'

interface MaintenanceFormData {
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  scheduledDate?: string
  cost?: number
  notes?: string
}

interface MaintenanceTrackerProps {
  roomId: string
  propertyId: string
  maintenanceRecords: MaintenanceRecord[]
  onUpdate: () => void
}

export function MaintenanceTracker({ 
  roomId, 
  propertyId, 
  maintenanceRecords, 
  onUpdate 
}: MaintenanceTrackerProps) {
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<MaintenanceFormData>({
    defaultValues: {
      priority: 'Medium'
    }
  })

  const onSubmit = async (data: MaintenanceFormData) => {
    try {
      setSubmitting(true)
      
      const maintenanceData = {
        ...data,
        roomId,
        propertyId,
        reportedDate: new Date(),
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        status: 'Pending' as const
      }

      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenanceData)
      })

      if (!response.ok) {
        throw new Error('Failed to create maintenance record')
      }

      reset()
      setShowForm(false)
      onUpdate()
      
    } catch (error) {
      console.error('Error creating maintenance record:', error)
      // TODO: Show toast notification
    } finally {
      setSubmitting(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low':
        return 'bg-blue-100 text-blue-800'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'High':
        return 'bg-orange-100 text-orange-800'
      case 'Urgent':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'In Progress':
        return 'bg-blue-100 text-blue-800'
      case 'Completed':
        return 'bg-green-100 text-green-800'
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-4 w-4" />
      case 'In Progress':
        return <Settings className="h-4 w-4" />
      case 'Completed':
        return <CheckCircle className="h-4 w-4" />
      case 'Cancelled':
        return <X className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Maintenance Records</h3>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          className="flex items-center gap-2"
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add Record
            </>
          )}
        </Button>
      </div>

      {/* Add Maintenance Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Maintenance Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  {...register('title', { required: 'Title is required' })}
                  placeholder="e.g., Fix leaky faucet, Replace light bulb"
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Detailed description of the maintenance issue..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="scheduledDate">Scheduled Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    {...register('scheduledDate')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost">Estimated Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    {...register('cost', { 
                      min: { value: 0, message: 'Cost cannot be negative' }
                    })}
                    placeholder="Enter estimated cost"
                  />
                  {errors.cost && (
                    <p className="text-sm text-red-600 mt-1">{errors.cost.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    {...register('notes')}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Record'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Records List */}
      {maintenanceRecords.length > 0 ? (
        <div className="space-y-4">
          {maintenanceRecords.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{record.title}</h4>
                    {record.description && (
                      <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(record.priority || 'Medium')}>
                      {record.priority === 'Urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {record.priority}
                    </Badge>
                    <Badge className={getStatusColor(record.status || 'Open')}>
                      {getStatusIcon(record.status || 'Open')}
                      <span className="ml-1">{record.status || 'Open'}</span>
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Reported:</span>
                    <p className="font-medium">
                      {new Date(record.reportedDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {record.scheduledDate && (
                    <div>
                      <span className="text-gray-600">Scheduled:</span>
                      <p className="font-medium">
                        {new Date(record.scheduledDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {record.cost && (
                    <div>
                      <span className="text-gray-600">Cost:</span>
                      <p className="font-medium">${record.cost.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {record.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{record.notes}</p>
                  </div>
                )}

                {record.completedDate && (
                  <div className="mt-3 text-sm text-green-600">
                    Completed on {new Date(record.completedDate).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No maintenance records yet</p>
            <p className="text-sm text-gray-500">
              Keep track of repairs, inspections, and maintenance tasks for this room
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
