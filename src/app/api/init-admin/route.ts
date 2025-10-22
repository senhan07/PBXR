import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultAdmin } from '@/lib/init-default-admin'

export async function POST(request: NextRequest) {
  try {
    const result = await ensureDefaultAdmin()
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to initialize admin user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Default admin user initialized successfully',
      admin: {
        username: result.username,
        name: result.name,
        role: result.role,
        createdAt: result.createdAt
      }
    })
  } catch (error) {
    console.error('Admin initialization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const result = await ensureDefaultAdmin()
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to check admin user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Admin user check completed',
      admin: {
        username: result.username,
        name: result.name,
        role: result.role,
        createdAt: result.createdAt
      }
    })
  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}