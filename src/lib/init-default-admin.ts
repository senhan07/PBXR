import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  name: 'Default Admin',
  role: 'admin'
}

export async function initializeDefaultAdmin() {
  try {
    console.log('Checking for default admin user...')
    
    // Check if any admin user exists
    const existingAdmin = await db.user.findFirst({
      where: { role: 'admin' }
    })

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username)
      return existingAdmin
    }

    console.log('No admin user found. Creating default admin...')

    // Check if the default admin username already exists with a different role
    const existingUser = await db.user.findFirst({
      where: { username: DEFAULT_ADMIN.username }
    })

    if (existingUser) {
      console.log('Username "admin" already exists with different role. Updating to admin role...')
      await db.user.update({
        where: { id: existingUser.id },
        data: { role: 'admin' }
      })
      console.log('Updated existing user to admin role')
      return { ...existingUser, role: 'admin' }
    }

    // Create default admin user
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10)
    
    const adminUser = await db.user.create({
      data: {
        username: DEFAULT_ADMIN.username,
        password: hashedPassword,
        name: DEFAULT_ADMIN.name,
        role: DEFAULT_ADMIN.role
      }
    })

    console.log('Default admin user created successfully!')
    console.log('Username:', DEFAULT_ADMIN.username)
    console.log('Password:', DEFAULT_ADMIN.password)
    console.log('IMPORTANT: Please change the default password after first login!')

    return adminUser
  } catch (error) {
    console.error('Failed to initialize default admin user:', error)
    throw error
  }
}

export async function ensureDefaultAdmin() {
  try {
    // First, ensure the database is connected
    await db.$connect()
    
    // Check if the role column exists in the users table
    try {
      await db.user.findFirst()
    } catch (error) {
      console.log('Database schema may not be up to date. Please run: npx prisma db push')
      return null
    }

    return await initializeDefaultAdmin()
  } catch (error) {
    console.error('Error ensuring default admin:', error)
    return null
  } finally {
    await db.$disconnect()
  }
}