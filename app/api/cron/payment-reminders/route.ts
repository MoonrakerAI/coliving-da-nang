import { NextRequest, NextResponse } from 'next/server'
import { processAutomatedReminders } from '@/lib/email/reminder-scheduler'
import { cleanupOldReminderLogs } from '@/lib/db/operations/reminders'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron or authorized source
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting automated payment reminder processing...')
    
    // Process automated reminders
    const results = await processAutomatedReminders()
    
    // Cleanup old reminder logs (keep last 90 days)
    const cleanedUp = await cleanupOldReminderLogs(90)
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        processed: results.processed,
        sent: results.sent,
        skipped: results.skipped,
        errors: results.errors,
        cleanedUpLogs: cleanedUp
      }
    }

    console.log('Automated reminder processing completed:', response.results)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to process automated reminders:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET endpoint for manual testing/monitoring
export async function GET(request: NextRequest) {
  try {
    // Verify authorization for manual testing
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      message: 'Payment reminder cron job endpoint is active',
      timestamp: new Date().toISOString(),
      nextScheduledRun: 'Daily at 9:00 AM UTC'
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
