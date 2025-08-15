'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PaymentMethod, PaymentMethodType } from '@/lib/db/models/payment'
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Globe, 
  Building, 
  Landmark,
  DollarSign 
} from 'lucide-react'

interface MethodSelectorProps {
  value?: PaymentMethodType
  onValueChange: (value: PaymentMethodType) => void
}

const paymentMethods = [
  {
    value: PaymentMethod.STRIPE,
    label: 'Stripe',
    description: 'Credit/Debit Cards, ACH',
    icon: CreditCard,
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    popular: true
  },
  {
    value: PaymentMethod.PAYPAL,
    label: 'PayPal',
    description: 'PayPal account transfer',
    icon: Globe,
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  {
    value: PaymentMethod.VENMO,
    label: 'Venmo',
    description: 'Mobile payment app',
    icon: Smartphone,
    color: 'bg-purple-50 border-purple-200 text-purple-800'
  },
  {
    value: PaymentMethod.WISE,
    label: 'Wise',
    description: 'International transfers',
    icon: Globe,
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  {
    value: PaymentMethod.REVOLUT,
    label: 'Revolut',
    description: 'Digital banking',
    icon: Building,
    color: 'bg-gray-50 border-gray-200 text-gray-800'
  },
  {
    value: PaymentMethod.WIRE,
    label: 'Wire Transfer',
    description: 'Bank wire transfer',
    icon: Landmark,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-800'
  },
  {
    value: PaymentMethod.CASH,
    label: 'Cash',
    description: 'Physical cash payment',
    icon: DollarSign,
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  }
]

export function MethodSelector({ value, onValueChange }: MethodSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon
          const isSelected = value === method.value
          
          return (
            <Card
              key={method.value}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary shadow-md' 
                  : 'hover:border-gray-300'
              }`}
              onClick={() => onValueChange(method.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${method.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-sm">{method.label}</h3>
                      {method.popular && (
                        <Badge variant="secondary" className="text-xs">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {method.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {value && (
        <div className="text-sm text-muted-foreground">
          Selected: <span className="font-medium">{value}</span>
        </div>
      )}
    </div>
  )
}
