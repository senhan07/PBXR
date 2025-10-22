import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const prober = await db.proberInstance.update({
      where: { id },
      data: {
        name,
        address,
        interval: intervalValue,
        scrapeTimeout: timeoutValue,
        enabled: enabled !== undefined ? enabled : true,
        description
      }
    })

    return NextResponse.json(prober)
  } catch (error) {
    console.error('Failed to update prober:', error)
    return NextResponse.json(
      { error: 'Failed to update prober' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await db.proberInstance.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Prober deleted successfully' })
  } catch (error) {
    console.error('Failed to delete prober:', error)
    return NextResponse.json(
      { error: 'Failed to delete prober' },
      { status: 500 }
    )
  }
}