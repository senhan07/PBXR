import { db } from './src/lib/db'
import bcrypt from 'bcryptjs'

async function seed() {
  try {
    // Create a default user with properly hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const defaultUser = await db.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Administrator',
        role: 'ADMIN'
      }
    })

    console.log('Default user created:', defaultUser)

    // Create default settings
    const settings = await db.settings.upsert({
      where: { userId: defaultUser.id },
      update: {},
      create: {
        userId: defaultUser.id,
        prometheusAddress: 'http://localhost:9090',
        blackboxExporterAddress: 'http://localhost:9115',
        probeEndpoint: '/raw-yaml',
        registrationEnabled: true
      }
    })

    console.log('Default settings created:', settings)

    // Create sample targets with the correct format
    const sampleTargets = [
      {
        name: 'Google Homepage',
        url: 'https://www.google.com',
        module: 'http_2xx',
        labels: '{"env": "production", "service": "google"}',
        blackboxIp: '127.0.0.1:9642',
        targetIp: null,
        protocol: 'icmp',
        location: 'INT',
        type: 'UPLINK',
        category: 'ROUTER',
        media: 'FO',
        provider: null,
        service: null,
        userId: defaultUser.id,
        createdBy: defaultUser.id
      },
      {
        name: 'GitHub API',
        url: 'https://api.github.com',
        module: 'http_2xx',
        labels: '{"env": "production", "service": "github"}',
        blackboxIp: '127.0.0.1:9642',
        targetIp: null,
        protocol: 'icmp',
        location: 'INT',
        type: 'UPLINK',
        category: 'ROUTER',
        media: 'FO',
        provider: null,
        service: null,
        userId: defaultUser.id,
        createdBy: defaultUser.id
      },
      {
        name: 'Instagram',
        url: 'https://www.instagram.com',
        module: 'http_2xx',
        labels: '{"env": "production", "service": "instagram"}',
        blackboxIp: '127.0.0.1:9642',
        targetIp: null,
        protocol: 'icmp',
        location: 'INT',
        type: 'UPLINK',
        category: 'ROUTER',
        media: 'FO',
        provider: null,
        service: null,
        userId: defaultUser.id,
        createdBy: defaultUser.id
      }
    ]

    for (const targetData of sampleTargets) {
      const target = await db.blackboxTarget.create({
        data: targetData
      })
      console.log('Sample target created:', target)
    }

    console.log('Database seeded successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await db.$disconnect()
  }
}

seed()