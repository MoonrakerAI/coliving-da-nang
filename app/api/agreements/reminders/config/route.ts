import { NextRequest, NextResponse } from 'next/server'
import { AutomatedReminderService, ReminderConfig } from '@/lib/agreements/reminders'
import { requireAuth } from '@/lib/auth-config'

// GET /api/agreements/reminders/config - Get reminder configuration
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = AutomatedReminderService.getConfig()
    const stats = await AutomatedReminderService.getReminderStats(30)
    
    return NextResponse.json({
      config,
      stats,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting reminder configuration:', error)
    return NextResponse.json(
      { error: 'Failed to get reminder configuration' },
      { status: 500 }
    )
  }
}

// PUT /api/agreements/reminders/config - Update reminder configuration
export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add role-based authorization (only admins should update config)
    
    const updates: Partial<ReminderConfig> = await request.json()
    
    // Validate configuration updates
    if (updates.schedules) {
      if (updates.schedules.initial && (updates.schedules.initial < 1 || updates.schedules.initial > 30)) {
        return NextResponse.json({ 
          error: 'Initial reminder schedule must be between 1 and 30 days' 
        }, { status: 400 })
      }
      
      if (updates.schedules.followup) {
        for (const day of updates.schedules.followup) {
          if (day < 1 || day > 60) {
            return NextResponse.json({ 
              error: 'Follow-up reminder schedules must be between 1 and 60 days' 
            }, { status: 400 })
          }
        }
      }
      
      if (updates.schedules.urgent && (updates.schedules.urgent < 1 || updates.schedules.urgent > 14)) {
        return NextResponse.json({ 
          error: 'Urgent reminder schedule must be between 1 and 14 days' 
        }, { status: 400 })
      }
      
      if (updates.schedules.final && (updates.schedules.final < 1 || updates.schedules.final > 7)) {
        return NextResponse.json({ 
          error: 'Final reminder schedule must be between 1 and 7 days' 
        }, { status: 400 })
      }
    }
    
    if (updates.maxAttempts && (updates.maxAttempts < 1 || updates.maxAttempts > 10)) {
      return NextResponse.json({ 
        error: 'Max attempts must be between 1 and 10' 
      }, { status: 400 })
    }

    // Update configuration
    AutomatedReminderService.updateConfig(updates)
    
    const updatedConfig = AutomatedReminderService.getConfig()
    
    console.log(`Reminder configuration updated by user ${user.id}:`, updates)
    
    return NextResponse.json({
      success: true,
      message: 'Reminder configuration updated successfully',
      config: updatedConfig,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating reminder configuration:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update configuration' },
      { status: 500 }
    )
  }
}
