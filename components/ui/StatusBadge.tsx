import { PaymentStatus } from '@/lib/db/models/payment'

interface StatusBadgeProps {
  status: keyof typeof PaymentStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const getStatusConfig = (status: keyof typeof PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✓',
          label: 'Paid'
        }
      case 'PENDING':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏳',
          label: 'Pending'
        }
      case 'OVERDUE':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '⚠️',
          label: 'Overdue'
        }
      case 'REFUNDED':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '↩️',
          label: 'Refunded'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
          label: 'Unknown'
        }
    }
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs'
      case 'lg':
        return 'px-3 py-1 text-sm'
      default:
        return 'px-2.5 py-0.5 text-xs'
    }
  }

  const config = getStatusConfig(status)
  const sizeClasses = getSizeClasses(size)

  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${config.color} ${sizeClasses}`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </span>
  )
}
