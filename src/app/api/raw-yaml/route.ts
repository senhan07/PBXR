import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get settings to find probe endpoint configuration
    const firstUser = await db.user.findFirst()
    if (!firstUser) {
      return NextResponse.json(
        { error: 'No configuration found' },
        { status: 404 }
      )
    }

    let settings = await db.settings.findUnique({
      where: { userId: firstUser.id }
    })

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not configured' },
        { status: 404 }
      )
    }

    // Get all enabled targets
    const enabledTargets = await db.blackboxTarget.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'desc' }
    })

    // Generate the configuration in the requested format
    const outputLines = enabledTargets.map(target => {
      const parts = [
        target.blackboxIp || 'blackbox-prober:9115',
        target.targetIp || '1.1.1.1',
        target.protocol || 'icmp',
        target.location || 'test-zone',
        target.type || 'test-service',
        target.category || 'test-device',
        target.media || 'test-conn',
        target.provider || 'test-loc',
        target.service || 'test-target'
      ]
      
      return `  - ${parts.join(';')}`
    })

    const config = `- targets:\n${outputLines.join('\n')}`

    // Return as YAML content
    return new NextResponse(config, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Failed to generate probe configuration:', error)
    return NextResponse.json(
      { error: 'Failed to generate configuration' },
      { status: 500 }
    )
  }
}