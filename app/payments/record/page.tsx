'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentForm } from './components/PaymentForm'
import { BatchUpload } from './components/BatchUpload'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusCircle, Upload } from 'lucide-react'

export default function PaymentRecordPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('single')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Record Payment</h1>
          <p className="text-muted-foreground">
            Record tenant payments across multiple payment methods
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/payments')}
        >
          Back to Payments
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Single Payment
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Batch Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Record Single Payment</CardTitle>
              <CardDescription>
                Enter payment details for a single tenant payment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Payment Upload</CardTitle>
              <CardDescription>
                Upload multiple payments at once using CSV file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BatchUpload />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
