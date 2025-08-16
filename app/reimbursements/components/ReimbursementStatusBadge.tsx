'use client'

import { Badge } from '@/components/ui/badge'
import { ReimbursementStatusType } from '@/lib/db/models/reimbursement'
import { CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react'

interface ReimbursementStatusBadgeProps {
  status: ReimbursementStatusType
  className?: string
}

export function ReimbursementStatusBadge({ status, className }: ReimbursementStatusBadgeProps) {
  const getStatusConfig = (status: ReimbursementStatusType) => {
    switch (status) {
      case 'Requested':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          label: 'Requested',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        }
      case 'Approved':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          label: 'Approved',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        }
      case 'Paid':
        return {
          variant: 'default' as const,
          icon: DollarSign,
          label: 'Paid',
          className: 'bg-green-100 text-green-800 border-green-200'
        }
      case 'Denied':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          label: 'Denied',
          className: 'bg-red-100 text-red-800 border-red-200'
        }
      default:
        return {
          variant: 'secondary' as const,
          icon: Clock,
          label: status,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant}
      className={`inline-flex items-center gap-1.5 ${config.className} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}
