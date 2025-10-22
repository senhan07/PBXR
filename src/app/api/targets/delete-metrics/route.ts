import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { targetName, targetIp } = await request.json()

    if (!targetName && !targetIp) {
      return NextResponse.json(
        { error: 'Target name or IP is required' },
        { status: 400 }
      )
    }

    // Get settings to find Prometheus address
    const firstUser = await db.user.findFirst()
    if (!firstUser) {
      return NextResponse.json(
        { error: 'No user found' },
        { status: 404 }
      )
    }

    let settings = await db.settings.findUnique({
      where: { userId: firstUser.id }
    })

    if (!settings) {
      // Create default settings if none exist
      settings = await db.settings.create({
        data: {
          userId: firstUser.id,
          prometheusAddress: 'http://localhost:9090',
          blackboxExporterAddress: 'http://localhost:9115'
        }
      })
    }

    // Construct the Prometheus delete request
    const prometheusUrl = `${settings.prometheusAddress}/api/v1/series`
    
    // Build matchers for the series to delete
    const matchers = []
    if (targetName) {
      matchers.push(`{__name__=~".*${targetName}.*"}`)
    }
    if (targetIp) {
      matchers.push(`{instance=~".*${targetIp}.*"}`)
    }

    try {
      // First, get the series to see what will be deleted
      const seriesResponse = await fetch(`${prometheusUrl}?match[]=${encodeURIComponent(matchers[0])}`, {
        method: 'GET',
      })

      if (seriesResponse.ok) {
        const seriesData = await seriesResponse.json()
        console.log('Series to delete:', seriesData)
      }

      // Delete the series using the Prometheus HTTP API
      const deleteResponse = await fetch(`${settings.prometheusAddress}/api/v1/admin/tsdb/delete_series`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `match[]=${encodeURIComponent(matchers.join(','))}`,
      })

      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json()
        return NextResponse.json({
          message: 'Metrics deleted successfully',
          deletedSeries: matchers,
          result: deleteResult
        })
      } else {
        const errorText = await deleteResponse.text()
        console.error('Prometheus delete failed:', errorText)
        return NextResponse.json(
          { error: 'Failed to delete metrics from Prometheus', details: errorText },
          { status: 500 }
        )
      }
    } catch (prometheusError) {
      console.error('Error communicating with Prometheus:', prometheusError)
      return NextResponse.json(
        { error: 'Failed to communicate with Prometheus', details: prometheusError.message },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Failed to delete metrics:', error)
    return NextResponse.json(
      { error: 'Failed to delete metrics' },
      { status: 500 }
    )
  }
}