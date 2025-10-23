#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  email: 'admin@localhost',
  name: 'Default Admin',
  role: 'admin'
};

async function initializeDefaultAdmin() {
  try {
    console.log('🔍 Checking for default admin user...');
    
    // Check if any admin user exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.username);
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Name:', existingAdmin.name);
      console.log('🔑 Role:', existingAdmin.role);
      return existingAdmin;
    }

    console.log('⚠️  No admin user found. Creating default admin...');

    // Check if the default admin username already exists with a different role
    const existingUser = await prisma.user.findFirst({
      where: { username: DEFAULT_ADMIN.username }
    });

    if (existingUser) {
      console.log('🔄 Username "admin" already exists with different role. Updating to admin role...');
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'admin' }
      });
      console.log('✅ Updated existing user to admin role');
      return { ...existingUser, role: 'admin' };
    }

    // Create default admin user
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
    
    const adminUser = await prisma.user.create({
      data: {
        username: DEFAULT_ADMIN.username,
        password: hashedPassword,
        name: DEFAULT_ADMIN.name,
        role: DEFAULT_ADMIN.role
      }
    });

    console.log('🎉 Default admin user created successfully!');
    console.log('📝 Username:', DEFAULT_ADMIN.username);
    console.log('🔒 Password:', DEFAULT_ADMIN.password);
    console.log('📧 Email:', DEFAULT_ADMIN.email);
    console.log('👤 Name:', DEFAULT_ADMIN.name);
    console.log('🔑 Role:', DEFAULT_ADMIN.role);
    console.log('');
    console.log('⚠️  IMPORTANT: Please change the default password after first login!');
    console.log('🔗 You can login at: http://localhost:3000/login');

    return adminUser;
  } catch (error) {
    console.error('❌ Failed to initialize default admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
if (require.main === module) {
  initializeDefaultAdmin()
    .then(() => {
      console.log('✅ Admin initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDefaultAdmin };