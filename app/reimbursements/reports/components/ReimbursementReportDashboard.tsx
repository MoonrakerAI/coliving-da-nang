'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ReimbursementRequest } from '@/lib/db/models/reimbursement'
import { DollarSign, Clock, CheckCircle, XCircle, TrendingUp, Calendar } from 'lucide-react'

interface ReimbursementStats {
  totalRequests: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  averageAmount: number
  averageProcessingTime: number
  statusBreakdown: Record<string, number>
  monthlyTrends: Array<{
    month: string
    requests: number
    amount: number
  }>
  paymentMethodBreakdown: Record<string, number>
}

interface ReimbursementReportDashboardProps {
  reimbursements: ReimbursementRequest[]
  loading?: boolean
  className?: string
}

export function ReimbursementReportDashboard({
  reimbursements,
  loading = false,
  className
}: ReimbursementReportDashboardProps) {
  const stats = useMemo((): ReimbursementStats => {
    if (!reimbursements.length) {
      return {
        totalRequests: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        averageAmount: 0,
        averageProcessingTime: 0,
        statusBreakdown: {},
        monthlyTrends: [],
        paymentMethodBreakdown: {}
      }
    }

    const totalRequests = reimbursements.length
    const totalAmount = reimbursements.reduce((sum, r) => sum + r.amountCents, 0)
    const paidAmount = reimbursements
      .filter(r => r.status === 'Paid')
      .reduce((sum, r) => sum + r.amountCents, 0)
    const pendingAmount = reimbursements
      .filter(r => ['Requested', 'Approved'].includes(r.status))
      .reduce((sum, r) => sum + r.amountCents, 0)
    const averageAmount = totalAmount / totalRequests

    // Calculate average processing time for completed requests
    const completedRequests = reimbursements.filter(r => 
      ['Paid', 'Denied'].includes(r.status) && r.statusHistory.length > 1
    )
    const averageProcessingTime = completedRequests.length > 0
      ? completedRequests.reduce((sum, r) => {
          const created = new Date(r.createdAt)
          const completed = new Date(r.statusHistory[r.statusHistory.length - 1].changedAt)
          return sum + (completed.getTime() - created.getTime())
        }, 0) / completedRequests.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0

    // Status breakdown
    const statusBreakdown = reimbursements.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Monthly trends (last 12 months)
    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = date.toISOString().slice(0, 7) // YYYY-MM format
      
      const monthRequests = reimbursements.filter(r => 
        r.createdAt.toISOString().slice(0, 7) === monthKey
      )
      
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        requests: monthRequests.length,
        amount: monthRequests.reduce((sum, r) => sum + r.amountCents, 0)
      }
    }).reverse()

    // Payment method breakdown
    const paymentMethodBreakdown = reimbursements
      .filter(r => r.paymentMethod)
      .reduce((acc, r) => {
        const method = r.paymentMethod!
        acc[method] = (acc[method] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    return {
      totalRequests,
      totalAmount,
      paidAmount,
      pendingAmount,
      averageAmount,
      averageProcessingTime,
      statusBreakdown,
      monthlyTrends,
      paymentMethodBreakdown
    }
  }, [reimbursements])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-500'
      case 'Approved': return 'bg-blue-500'
      case 'Requested': return 'bg-yellow-500'
      case 'Denied': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats.totalRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.paidAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalAmount > 0 ? Math.round((stats.paidAmount / stats.totalAmount) * 100) : 0}% of total
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatCurrency(stats.averageAmount)}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => {
              const percentage = stats.totalRequests > 0 ? (count / stats.totalRequests) * 100 : 0
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                      <span className="text-sm font-medium">{status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{count}</span>
                      <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Processing Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Average Processing Time</span>
                <span className="text-sm text-muted-foreground">
                  {stats.averageProcessingTime.toFixed(1)} days
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-sm text-muted-foreground">
                  {stats.totalRequests > 0 
                    ? Math.round(((stats.statusBreakdown.Paid || 0) / stats.totalRequests) * 100)
                    : 0}%
                </span>
              </div>
            </div>

            {Object.keys(stats.paymentMethodBreakdown).length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Payment Methods</span>
                <div className="space-y-1">
                  {Object.entries(stats.paymentMethodBreakdown).map(([method, count]) => (
                    <div key={method} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{method}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stats.monthlyTrends.slice(-6).map((trend, index) => (
                <div key={index} className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground">{trend.month}</p>
                  <p className="text-lg font-semibold">{trend.requests}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(trend.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
