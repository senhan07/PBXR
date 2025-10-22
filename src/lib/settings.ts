import { db } from '@/lib/db'

interface AppSettings {
  maxSuggestions: number
  hiddenLabels: string[]
}

const DEFAULT_SETTINGS: AppSettings = {
  maxSuggestions: 5,
  hiddenLabels: ['__tmp_enabled']
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const settingsRecord = await db.appSetting.findFirst({
      where: { key: 'app_settings' }
    })
    
    if (settingsRecord) {
      return JSON.parse(settingsRecord.value as string)
    }
    
    return DEFAULT_SETTINGS
  } catch (error) {
    console.error('Failed to fetch app settings:', error)
    return DEFAULT_SETTINGS
  }
}

// Client-side function to fetch settings
export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const response = await fetch('/api/settings')
    if (response.ok) {
      return await response.json()
    }
    return DEFAULT_SETTINGS
  } catch (error) {
    console.error('Failed to fetch app settings:', error)
    return DEFAULT_SETTINGS
  }
}