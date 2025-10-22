import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface UserSettings {
  prometheusAddress: string
  prometheusAuthMethod: string
  prometheusUsername?: string
  prometheusPassword?: string
  prometheusBearerToken?: string
  prometheusRefreshInterval: string
  blackboxExporterAddress: string
  probeEndpoint: string
  probeEndpointEnabled: boolean
  prometheusProbeEndpoint: string
  prometheusProbeEndpointEnabled: boolean
  registrationEnabled: boolean
  autoLogoutMinutes: number
  autoLogoutEnabled: boolean
}

const DEFAULT_USER_SETTINGS: UserSettings = {
  prometheusAddress: 'http://localhost:9090',
  prometheusAuthMethod: 'none',
  prometheusUsername: '',
  prometheusPassword: '',
  prometheusBearerToken: '',
  prometheusRefreshInterval: '1m',
  blackboxExporterAddress: 'http://localhost:9115',
  probeEndpoint: '/json',
  probeEndpointEnabled: false,
  prometheusProbeEndpoint: '/prometheus',
  prometheusProbeEndpointEnabled: false,
  registrationEnabled: true,
  autoLogoutMinutes: 15,
  autoLogoutEnabled: false
}

// Helper function to get user from request
async function getUserFromRequest(request: NextRequest) {
  console.log('=== NEW getUserFromRequest called ===')
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const userStr = Buffer.from(token, 'base64').toString('utf-8')
    const user = JSON.parse(userStr)
    
    // Verify user exists in database - use ID instead of email for reliability
    console.log('Looking up user by ID:', user.id)
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      include: { settings: true }
    })

    if (!dbUser) {
      return null
    }

    return dbUser
  } catch (error) {
    console.error('Error parsing user token:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.settings) {
      return NextResponse.json({
        prometheusAddress: user.settings.prometheusAddress,
        prometheusAuthMethod: user.settings.prometheusAuthMethod,
        prometheusUsername: user.settings.prometheusUsername || '',
        prometheusPassword: user.settings.prometheusPassword || '',
        prometheusBearerToken: user.settings.prometheusBearerToken || '',
        prometheusRefreshInterval: user.settings.prometheusRefreshInterval || '1m',
        blackboxExporterAddress: user.settings.blackboxExporterAddress,
        probeEndpoint: user.settings.probeEndpoint,
        probeEndpointEnabled: user.settings.probeEndpointEnabled,
        prometheusProbeEndpoint: user.settings.prometheusProbeEndpoint,
        prometheusProbeEndpointEnabled: user.settings.prometheusProbeEndpointEnabled,
        registrationEnabled: user.settings.registrationEnabled,
        autoLogoutMinutes: user.settings.autoLogoutMinutes,
        autoLogoutEnabled: user.settings.autoLogoutEnabled
      })
    } else {
      return NextResponse.json(DEFAULT_USER_SETTINGS)
    }
  } catch (error) {
    console.error('Failed to fetch user settings:', error)
    return NextResponse.json(DEFAULT_USER_SETTINGS)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings: UserSettings = await request.json()

    // Validate settings
    if (typeof settings.prometheusAddress !== 'string' || !settings.prometheusAddress.trim()) {
      return NextResponse.json(
        { error: 'prometheusAddress is required' },
        { status: 400 }
      )
    }

    if (typeof settings.prometheusAuthMethod !== 'string' || !['none', 'basic', 'bearer'].includes(settings.prometheusAuthMethod)) {
      return NextResponse.json(
        { error: 'prometheusAuthMethod must be one of: none, basic, bearer' },
        { status: 400 }
      )
    }

    if (settings.prometheusAuthMethod === 'basic') {
      if (typeof settings.prometheusUsername !== 'string' || !settings.prometheusUsername.trim()) {
        return NextResponse.json(
          { error: 'prometheusUsername is required when using basic authentication' },
          { status: 400 }
        )
      }
      if (typeof settings.prometheusPassword !== 'string' || !settings.prometheusPassword.trim()) {
        return NextResponse.json(
          { error: 'prometheusPassword is required when using basic authentication' },
          { status: 400 }
        )
      }
    }

    if (settings.prometheusAuthMethod === 'bearer') {
      if (typeof settings.prometheusBearerToken !== 'string' || !settings.prometheusBearerToken.trim()) {
        return NextResponse.json(
          { error: 'prometheusBearerToken is required when using bearer authentication' },
          { status: 400 }
        )
      }
    }

    if (typeof settings.blackboxExporterAddress !== 'string' || !settings.blackboxExporterAddress.trim()) {
      return NextResponse.json(
        { error: 'blackboxExporterAddress is required' },
        { status: 400 }
      )
    }

    if (typeof settings.probeEndpoint !== 'string' || !settings.probeEndpoint.trim()) {
      return NextResponse.json(
        { error: 'probeEndpoint is required' },
        { status: 400 }
      )
    }

    if (typeof settings.probeEndpointEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'probeEndpointEnabled must be a boolean' },
        { status: 400 }
      )
    }

    if (typeof settings.prometheusProbeEndpoint !== 'string') {
      return NextResponse.json(
        { error: 'prometheusProbeEndpoint must be a string' },
        { status: 400 }
      )
    }

    if (typeof settings.prometheusProbeEndpointEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'prometheusProbeEndpointEnabled must be a boolean' },
        { status: 400 }
      )
    }

    if (typeof settings.registrationEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'registrationEnabled must be a boolean' },
        { status: 400 }
      )
    }

    if (typeof settings.autoLogoutMinutes !== 'number' || settings.autoLogoutMinutes < 1 || settings.autoLogoutMinutes > 120) {
      return NextResponse.json(
        { error: 'autoLogoutMinutes must be a number between 1 and 120' },
        { status: 400 }
      )
    }

    if (typeof settings.autoLogoutEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'autoLogoutEnabled must be a boolean' },
        { status: 400 }
      )
    }

    if (typeof settings.prometheusRefreshInterval !== 'string' || !settings.prometheusRefreshInterval.trim()) {
      return NextResponse.json(
        { error: 'prometheusRefreshInterval is required' },
        { status: 400 }
      )
    }

    // Update or create settings
    await db.settings.upsert({
      where: { userId: user.id },
      update: {
        prometheusAddress: settings.prometheusAddress,
        prometheusAuthMethod: settings.prometheusAuthMethod,
        prometheusUsername: settings.prometheusUsername || null,
        prometheusPassword: settings.prometheusPassword || null,
        prometheusBearerToken: settings.prometheusBearerToken || null,
        prometheusRefreshInterval: settings.prometheusRefreshInterval,
        blackboxExporterAddress: settings.blackboxExporterAddress,
        probeEndpoint: settings.probeEndpoint,
        probeEndpointEnabled: settings.probeEndpointEnabled,
        prometheusProbeEndpoint: settings.prometheusProbeEndpoint,
        prometheusProbeEndpointEnabled: settings.prometheusProbeEndpointEnabled,
        registrationEnabled: settings.registrationEnabled,
        autoLogoutMinutes: settings.autoLogoutMinutes,
        autoLogoutEnabled: settings.autoLogoutEnabled,
        updatedAt: new Date()
      },
      create: {
        prometheusAddress: settings.prometheusAddress,
        prometheusAuthMethod: settings.prometheusAuthMethod,
        prometheusUsername: settings.prometheusUsername || null,
        prometheusPassword: settings.prometheusPassword || null,
        prometheusBearerToken: settings.prometheusBearerToken || null,
        prometheusRefreshInterval: settings.prometheusRefreshInterval,
        blackboxExporterAddress: settings.blackboxExporterAddress,
        probeEndpoint: settings.probeEndpoint,
        probeEndpointEnabled: settings.probeEndpointEnabled,
        prometheusProbeEndpoint: settings.prometheusProbeEndpoint,
        prometheusProbeEndpointEnabled: settings.prometheusProbeEndpointEnabled,
        registrationEnabled: settings.registrationEnabled,
        autoLogoutMinutes: settings.autoLogoutMinutes,
        autoLogoutEnabled: settings.autoLogoutEnabled,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Failed to save user settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}