'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function TemplateEditPage() {
  const router = useRouter()
  const [loading] = useState(false)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            Template Editor
          </h1>
          <p className="text-muted-foreground">
            Template editing functionality coming soon
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is under development. Please check back later.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
