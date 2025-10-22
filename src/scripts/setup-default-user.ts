import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function setupDefaultUser() {
  try {
    // Check if admin user exists
    const existingAdmin = await db.user.findFirst({
      where: { role: 'admin' }
    })

    if (!existingAdmin) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin', 12)
      
      const admin = await db.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          name: 'Admin User',
          role: 'admin'
        }
      })
      
      console.log('Default admin user created:', admin.username)
      console.log('Username: admin')
      console.log('Password: admin')
    } else {
      console.log('Admin user already exists:', existingAdmin.username)
    }
  } catch (error) {
    console.error('Error setting up default user:', error)
  } finally {
    await db.$disconnect()
  }
}

setupDefaultUser()