'use client'

import { StatusChange } from '@/lib/db/models/reimbursement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { ReimbursementStatusBadge } from './ReimbursementStatusBadge'

interface ReimbursementStatusHistoryProps {
  statusHistory: StatusChange[]
  className?: string
}

export function ReimbursementStatusHistory({ statusHistory, className }: ReimbursementStatusHistoryProps) {
  if (!statusHistory || statusHistory.length === 0) {
    return null
  }

  // Sort by date (most recent first)
  const sortedHistory = [...statusHistory].sort((a, b) => 
    new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Status History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedHistory.map((change, index) => (
            <div key={change.id} className="flex items-start space-x-3">
              {/* Avatar */}
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="text-xs">
                  {change.changedBy.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Status change details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {change.fromStatus && (
                    <>
                      <ReimbursementStatusBadge status={change.fromStatus} />
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <ReimbursementStatusBadge status={change.toStatus} />
                </div>
                
                {change.comment && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {change.comment}
                  </p>
                )}
                
                {change.reason && (
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Reason:</span> {change.reason}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(change.changedAt), { addSuffix: true })}</span>
                  <span>•</span>
                  <span>by {change.changedBy}</span>
                </div>
              </div>
              
              {/* Timeline connector */}
              {index < sortedHistory.length - 1 && (
                <div className="absolute left-[52px] mt-10 w-px h-4 bg-border" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
