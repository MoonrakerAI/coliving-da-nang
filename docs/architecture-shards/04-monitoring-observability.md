# Monitoring and Observability - Coliving Management System

## Monitoring Stack

- **Frontend Monitoring:** Vercel Analytics (Core Web Vitals, user interactions)
- **Backend Monitoring:** Vercel Functions (execution time, memory usage, errors)
- **Error Tracking:** Console logging with structured data for Vercel log aggregation
- **Performance Monitoring:** Built-in Vercel metrics and custom timing

## Key Metrics

**Frontend Metrics:**
- Largest Contentful Paint (LCP) < 2.5s
- First Input Delay (FID) < 100ms
- Cumulative Layout Shift (CLS) < 0.1
- Time to Interactive (TTI) < 3.5s

**Backend Metrics:**
- API response time p95 < 500ms
- Error rate < 1%
- Function cold start time < 200ms
- Database query time p95 < 50ms

**Business Metrics:**
- Payment processing success rate > 99%
- Expense entry completion rate > 95%
- Mobile app engagement (time spent on expense entry)
- Email reminder delivery rate > 98%

## Logging Strategy

```typescript
// lib/logger.ts
interface LogContext {
  userId?: string;
  propertyId?: string;
  requestId?: string;
  action?: string;
}

export class Logger {
  static info(message: string, context?: LogContext) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  }

  static error(message: string, error: Error, context?: LogContext) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
      ...context,
    }));
  }

  static payment(action: string, paymentId: string, context?: LogContext) {
    this.info(`Payment ${action}`, {
      ...context,
      action: `payment.${action}`,
      paymentId,
    });
  }

  static expense(action: string, expenseId: string, context?: LogContext) {
    this.info(`Expense ${action}`, {
      ...context,
      action: `expense.${action}`,
      expenseId,
    });
  }
}

// Usage in API routes
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    Logger.info('Creating expense', { 
      requestId, 
      action: 'expense.create.start' 
    });

    const expense = await db.createExpense(data);
    
    Logger.expense('created', expense.id, { 
      requestId, 
      userId: session.user.id,
      propertyId: expense.propertyId 
    });

    return NextResponse.json(expense);
  } catch (error) {
    Logger.error('Failed to create expense', error, { 
      requestId,
      action: 'expense.create.error' 
    });
    
    throw error;
  }
}
```
