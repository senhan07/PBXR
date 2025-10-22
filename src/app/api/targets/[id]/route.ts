import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Validation function for target addresses
const validateTargetAddress = (address: string): { isValid: boolean; error?: string } => {
  if (!address || address.trim() === '') {
    return { isValid: false, error: 'Target address is required' }
  }

  const trimmedAddress = address.trim()

  // Check for spaces (invalid format)
  if (trimmedAddress.includes(' ')) {
    return { 
      isValid: false, 
      error: 'Invalid target address. Addresses cannot contain spaces. Please enter a valid IP address, domain name, or URL (e.g., 192.168.1.1, example.com, or https://example.com)' 
    }
  }

  // Check for multiple dots in sequence (invalid format)
  if (trimmedAddress.includes('..')) {
    return { 
      isValid: false, 
      error: 'Invalid target address. Please enter a valid IP address, domain name, or URL (e.g., 192.168.1.1, example.com, or https://example.com)' 
    }
  }

  // IPv4 address validation (strict)
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  if (ipv4Regex.test(trimmedAddress)) {
    return { isValid: true }
  }

  // IPv6 address validation (strict)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:){1,7}:|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})$|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)$/
  if (ipv6Regex.test(trimmedAddress)) {
    return { isValid: true }
  }

  // Domain name validation (strict - no spaces, no consecutive dots, proper format)
  const domainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
  if (domainRegex.test(trimmedAddress)) {
    return { isValid: true }
  }

  // Single word domain (like localhost) validation
  const singleWordDomainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
  if (singleWordDomainRegex.test(trimmedAddress) && trimmedAddress.length <= 63) {
    return { isValid: true }
  }

  // URL validation (strict)
  try {
    const url = new URL(trimmedAddress)
    // Check if URL has valid protocol and hostname
    if (url.protocol && url.hostname && !url.hostname.includes(' ') && !url.hostname.includes('..')) {
      return { isValid: true }
    }
  } catch (e) {
    // If URL parsing fails, try adding http:// prefix for domain validation
    try {
      const url = new URL(`http://${trimmedAddress}`)
      if (url.hostname && !url.hostname.includes(' ') && !url.hostname.includes('..')) {
        return { isValid: true }
      }
    } catch (e2) {
      // Invalid URL format
    }
  }

  return { 
    isValid: false, 
    error: 'Invalid target address. Please enter a valid IP address (e.g., 192.168.1.1), domain name (e.g., example.com), or URL (e.g., https://example.com)' 
  }
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const response = new NextResponse(null, { status: 200 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('POST endpoint called for update with id:', id)
    
    const body = await request.json()
    console.log('POST request body:', body)
    
    // Handle both label-only updates and full updates
    const { 
      labels, 
      name, 
      url, 
      module, 
      blackboxIp,
      targetIp,
      protocol,
      probeAssignments
    } = body

    // Validate target address if URL is provided
    if (url !== undefined) {
      const addressValidation = validateTargetAddress(url)
      if (!addressValidation.isValid) {
        return NextResponse.json(
          { error: addressValidation.error },
          { status: 400 }
        )
      }
    }

    // Check if target exists first
    const existingTarget = await db.blackboxTarget.findUnique({
      where: { id }
    })
    
    if (!existingTarget) {
      console.error('Target not found:', id)
      return NextResponse.json(
        { error: 'Target not found' },
        { status: 404 }
      )
    }

    // Build update data object with only provided fields
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (url !== undefined) updateData.url = url
    if (module !== undefined) updateData.module = module
    if (labels !== undefined) updateData.labels = labels
    if (blackboxIp !== undefined) updateData.blackboxIp = blackboxIp
    if (targetIp !== undefined) updateData.targetIp = targetIp
    if (protocol !== undefined) updateData.protocol = protocol
    if (probeAssignments !== undefined) updateData.probeAssignments = probeAssignments

    const target = await db.blackboxTarget.update({
      where: { id },
      data: updateData
    })

    console.log('Successfully updated target:', target)

    const response = NextResponse.json(target)
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  } catch (error) {
    console.error('Failed to update target:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update target', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('PATCH endpoint called for update with id:', id)
    
    const body = await request.json()
    console.log('PATCH request body:', body)
    
    const { 
      name, 
      url, 
      module, 
      labels, 
      blackboxIp,
      targetIp,
      protocol,
      probeAssignments
    } = body

    // Validate target address if URL is provided
    if (url !== undefined) {
      const addressValidation = validateTargetAddress(url)
      if (!addressValidation.isValid) {
        return NextResponse.json(
          { error: addressValidation.error },
          { status: 400 }
        )
      }
    }

    // Check if target exists first
    const existingTarget = await db.blackboxTarget.findUnique({
      where: { id }
    })
    
    if (!existingTarget) {
      console.error('Target not found:', id)
      return NextResponse.json(
        { error: 'Target not found' },
        { status: 404 }
      )
    }

    // Build update data object with only provided fields
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (url !== undefined) updateData.url = url
    if (module !== undefined) updateData.module = module
    if (labels !== undefined) updateData.labels = labels
    if (blackboxIp !== undefined) updateData.blackboxIp = blackboxIp
    if (targetIp !== undefined) updateData.targetIp = targetIp
    if (protocol !== undefined) updateData.protocol = protocol
    if (probeAssignments !== undefined) updateData.probeAssignments = probeAssignments

    const target = await db.blackboxTarget.update({
      where: { id },
      data: updateData
    })

    console.log('Successfully updated target:', target)

    const response = NextResponse.json(target)
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  } catch (error) {
    console.error('Failed to update target:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update target', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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

    await db.blackboxTarget.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Target deleted successfully' })
  } catch (error) {
    console.error('Failed to delete target:', error)
    return NextResponse.json(
      { error: 'Failed to delete target' },
      { status: 500 }
    )
  }
}