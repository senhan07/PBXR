import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const probers = await db.proberInstance.findMany({
      orderBy: { createdAt: 'asc' }
    })
    
    return NextResponse.json({ probers })

  } catch (error) {
    console.error('Failed to fetch probers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch probers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address, interval, scrapeTimeout, enabled, description } = body

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      )
    }

    // Validate address format (IP:Port)
    const addressRegex = /^(\d{1,3}\.){3}\d{1,3}:\d+$/
    if (!addressRegex.test(address)) {
      return NextResponse.json(
        { error: 'Address must be in IP:Port format (e.g., 192.168.1.1:9115)' },
        { status: 400 }
      )
    }

    // Validate timeout is not greater than interval
    const intervalValue = interval || 5
    const timeoutValue = scrapeTimeout || 5
    
    if (timeoutValue > intervalValue) {
      return NextResponse.json(
        { error: 'Scrape timeout must be less than or equal to scrape interval' },
        { status: 400 }
      )
    }

    const prober = await db.proberInstance.create({
      data: {
        name,
        address,
        interval: intervalValue,
        scrapeTimeout: timeoutValue,
        enabled: enabled !== undefined ? enabled : true,
        description
      }
    })

    return NextResponse.json(prober, { status: 201 })
  } catch (error) {
    console.error('Failed to create prober:', error)
    return NextResponse.json(
      { error: 'Failed to create prober' },
      { status: 500 }
    )
  }
}