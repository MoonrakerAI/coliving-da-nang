import { Metadata } from 'next'
import { ExpenseForm } from './components/ExpenseForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'New Expense | Coliving Da Nang',
  description: 'Add a new property expense',
}

export default function NewExpensePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Add Expense</h1>
          <p className="text-sm text-muted-foreground">
            Quickly log property expenses with receipts
          </p>
        </div>
        
        <ExpenseForm />
      </div>
    </div>
  )
}
