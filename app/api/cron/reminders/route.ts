import { NextRequest, NextResponse } from 'next/server'
import { AutomatedReminderService } from '@/lib/agreements/reminders'

// POST /api/cron/reminders - Process automated reminders (called by cron job)
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request for reminders')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting automated reminder processing via cron job...')
    
    // Process all pending reminders
    const stats = await AutomatedReminderService.processReminders()
    
    // Log results
    console.log('Automated reminder processing completed:', stats)
    
    return NextResponse.json({
      success: true,
      message: 'Reminder processing completed',
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in automated reminder cron job:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET /api/cron/reminders - Get reminder processing status and configuration
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate request (optional for status check)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized request for reminder status')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current configuration and stats
    const config = AutomatedReminderService.getConfig()
    const stats = await AutomatedReminderService.getReminderStats(30)
    
    return NextResponse.json({
      config,
      stats,
      status: config.enabled ? 'enabled' : 'disabled',
      lastCheck: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting reminder status:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
