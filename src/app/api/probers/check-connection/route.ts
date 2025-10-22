import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    // Parse IP and port
    const [host, port] = address.split(':')
    
    // Simple connection check using fetch (assuming blackbox exporter has a health endpoint)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(`http://${address}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Blackbox-Monitor-Connection-Check'
        }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return NextResponse.json({ 
          success: true, 
          message: 'Connection successful',
          status: response.status
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status
        })
      }
    } catch (fetchError) {
      // If fetch fails, try a basic TCP connection check
      return NextResponse.json({ 
        success: false, 
        message: `Connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      })
    }
  } catch (error) {
    console.error('Connection check failed:', error)
    return NextResponse.json(
      { error: 'Connection check failed' },
      { status: 500 }
    )
  }
}