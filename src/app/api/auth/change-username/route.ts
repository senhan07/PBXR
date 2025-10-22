import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { newUsername, currentPassword } = await request.json()

    if (!newUsername || !currentPassword) {
      return NextResponse.json(
        { error: 'New username and current password are required' },
        { status: 400 }
      )
    }

    // Validate username length
    if (newUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 }
      )
    }

    // Validate username format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    // Get user from token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let user
    try {
      user = JSON.parse(Buffer.from(token, 'base64').toString())
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get current user from database
    const currentUser = await db.user.findUnique({
      where: { id: user.id }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Check if new username is already taken
    const existingUser = await db.user.findUnique({
      where: { username: newUsername }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Update username
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { username: newUsername }
    })

    const { password: _, ...userWithoutPassword } = updatedUser

    return NextResponse.json({
      message: 'Username changed successfully',
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Change username error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}