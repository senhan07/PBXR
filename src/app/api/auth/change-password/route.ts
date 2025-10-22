import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Helper function to get user from request
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const userStr = Buffer.from(token, 'base64').toString('utf-8')
    const user = JSON.parse(userStr)
    
    // Verify user exists in database - use ID instead of email for reliability
    const dbUser = await db.user.findUnique({
      where: { id: user.id }
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

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, currentUser.password)
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // Update password in database
    await db.user.update({
      where: { id: currentUser.id },
      data: { password: hashedNewPassword }
    })

    return NextResponse.json({ 
      message: 'Password changed successfully' 
    })

  } catch (error) {
    console.error('Failed to change password:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}