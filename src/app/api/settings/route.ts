import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface Settings {
  maxSuggestions: number
  hiddenLabels: string[]
}

const DEFAULT_SETTINGS: Settings = {
  maxSuggestions: 5,
  hiddenLabels: ['__tmp_enabled']
}

export async function GET() {
  try {
    // For now, we'll store settings in a simple way
    // In a real app, you might want a dedicated settings table
    const settingsRecord = await db.appSetting.findFirst({
      where: { key: 'app_settings' }
    })

    if (settingsRecord) {
      const settings = JSON.parse(settingsRecord.value as string)
      return NextResponse.json(settings)
    } else {
      return NextResponse.json(DEFAULT_SETTINGS)
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings: Settings = await request.json()

    // Validate settings
    if (typeof settings.maxSuggestions !== 'number' || 
        settings.maxSuggestions < 1 || 
        settings.maxSuggestions > 20) {
      return NextResponse.json(
        { error: 'maxSuggestions must be between 1 and 20' },
        { status: 400 }
      )
    }

    if (!Array.isArray(settings.hiddenLabels)) {
      return NextResponse.json(
        { error: 'hiddenLabels must be an array' },
        { status: 400 }
      )
    }

    // Upsert settings
    await db.appSetting.upsert({
      where: { key: 'app_settings' },
      update: {
        value: JSON.stringify(settings),
        updatedAt: new Date()
      },
      create: {
        key: 'app_settings',
        value: JSON.stringify(settings),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}