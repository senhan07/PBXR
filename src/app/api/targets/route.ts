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

export async function GET(request: NextRequest) {
  try {
    // For now, return all targets (in production, filter by authenticated user)
    const targets = await db.blackboxTarget.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(targets)
  } catch (error) {
    console.error('Failed to fetch targets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch targets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      url, 
      module, 
      labels, 
      userId,
      blackboxIp,
      targetIp,
      protocol,
      probeAssignments
    } = await request.json()

    if (!name || !url || !module) {
      return NextResponse.json(
        { error: 'Name, URL, and module are required' },
        { status: 400 }
      )
    }

    // Validate target address
    const addressValidation = validateTargetAddress(url)
    if (!addressValidation.isValid) {
      return NextResponse.json(
        { error: addressValidation.error },
        { status: 400 }
      )
    }

    // Use provided userId or default to first user
    let targetUserId = userId
    if (!targetUserId) {
      const firstUser = await db.user.findFirst()
      if (!firstUser) {
        return NextResponse.json(
          { error: 'No users found. Please create a user first.' },
          { status: 400 }
        )
      }
      targetUserId = firstUser.id
    }
    
    const target = await db.blackboxTarget.create({
      data: {
        name,
        url,
        module,
        labels: labels || null,
        userId: targetUserId,
        blackboxIp: blackboxIp || '127.0.0.1:9642',
        targetIp: targetIp || null,
        protocol: protocol || 'icmp',
        probeAssignments: probeAssignments || null
      }
    })

    return NextResponse.json(target, { status: 201 })
  } catch (error) {
    console.error('Failed to create target:', error)
    return NextResponse.json(
      { error: 'Failed to create target' },
      { status: 500 }
    )
  }
}