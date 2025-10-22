import { PrismaClient } from '@prisma/client'
import { ZAI } from 'z-ai-web-dev-sdk'

const prisma = new PrismaClient()

// Sample data for generating realistic targets
const sampleData = {
  names: [
    'Main Website', 'API Gateway', 'Database Server', 'CDN Endpoint', 'Load Balancer',
    'Auth Service', 'Payment Gateway', 'Email Service', 'Search API', 'Storage Service',
    'Cache Server', 'Analytics Service', 'Notification Service', 'File Server', 'Backup Service',
    'Monitoring Service', 'Logging Service', 'Config Service', 'Image Processor', 'Video Streamer'
  ],
  domains: [
    'example.com', 'api.example.com', 'cdn.example.com', 'app.example.com', 'admin.example.com',
    'service.example.com', 'gateway.example.com', 'auth.example.com', 'payment.example.com', 'mail.example.com',
    'search.example.com', 'storage.example.com', 'cache.example.com', 'analytics.example.com', 'notify.example.com',
    'files.example.com', 'backup.example.com', 'monitor.example.com', 'logs.example.com', 'config.example.com'
  ],
  modules: ['http_2xx', 'http_post_2xx', 'tcp_connect', 'icmp', 'dns', 'grpc', 'ssh_banner'],
  protocols: ['http', 'https', 'tcp', 'icmp', 'dns', 'grpc', 'ssh']
}

// Generate random labels
function generateRandomLabels() {
  const possibleLabels = [
    'env:production', 'env:staging', 'env:development',
    'team:frontend', 'team:backend', 'team:devops', 'team:security',
    'priority:high', 'priority:medium', 'priority:low',
    'region:us-east', 'region:us-west', 'region:eu-central', 'region:asia-pacific',
    'tier:critical', 'tier:important', 'tier:normal',
    'monitored:true', 'monitored:false',
    'owner:engineering', 'owner:product', 'owner:operations',
    'status:active', 'status:maintenance', 'status:testing'
  ]
  
  const numLabels = Math.floor(Math.random() * 4) + 1 // 1-4 labels per target
  const shuffled = possibleLabels.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, numLabels)
}

// Generate random probe assignments
function generateRandomProbeAssignments() {
  const numProbes = Math.floor(Math.random() * 3) + 1 // 1-3 probes per target
  const probes = []
  for (let i = 0; i < numProbes; i++) {
    probes.push(`probe-${Math.floor(Math.random() * 5) + 1}`)
  }
  return JSON.stringify(probes)
}

// Generate random IP addresses
function generateRandomIP() {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
}

async function seedTargets() {
  try {
    console.log('🌱 Starting to seed 20 random target data...')

    // Get the first user (admin) to associate with targets
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.')
      return
    }

    console.log(`👤 Using admin user: ${adminUser.username}`)

    // Clear existing targets (optional - comment out if you want to keep existing data)
    const existingCount = await prisma.blackboxTarget.count()
    if (existingCount > 0) {
      console.log(`🗑️  Found ${existingCount} existing targets. Deleting them...`)
      await prisma.blackboxTarget.deleteMany()
    }

    // Generate 20 random targets
    const targets = []
    for (let i = 0; i < 20; i++) {
      const name = sampleData.names[i]
      const domain = sampleData.domains[i]
      const module = sampleData.modules[Math.floor(Math.random() * sampleData.modules.length)]
      const protocol = sampleData.protocols[Math.floor(Math.random() * sampleData.protocols.length)]

      const target = {
        name: `${name} ${i + 1}`,
        url: protocol === 'http' || protocol === 'https' 
          ? `${protocol}://${domain}` 
          : protocol === 'icmp' 
          ? domain 
          : `${domain}:${80 + Math.floor(Math.random() * 9000)}`,
        module,
        labels: JSON.stringify(generateRandomLabels()),
        enabled: Math.random() > 0.2, // 80% chance of being enabled
        blackboxIp: '127.0.0.1:9642',
        targetIp: generateRandomIP(),
        protocol,
        probeAssignments: generateRandomProbeAssignments(),
        userId: adminUser.id
      }

      targets.push(target)
    }

    // Insert all targets
    console.log('📝 Inserting 20 targets into database...')
    await prisma.blackboxTarget.createMany({
      data: targets
    })

    console.log('✅ Successfully seeded 20 random target data!')
    console.log('\n📊 Generated Targets Summary:')
    console.log(`   Total Targets: ${targets.length}`)
    console.log(`   Enabled Targets: ${targets.filter(t => t.enabled).length}`)
    console.log(`   Disabled Targets: ${targets.filter(t => !t.enabled).length}`)
    console.log(`   Protocols: ${[...new Set(targets.map(t => t.protocol))].join(', ')}`)
    console.log(`   Modules: ${[...new Set(targets.map(t => t.module))].join(', ')}`)

    // Show some examples
    console.log('\n🔍 Example Targets:')
    targets.slice(0, 5).forEach((target, index) => {
      console.log(`   ${index + 1}. ${target.name} (${target.url}) - ${target.enabled ? '✅' : '❌'}`)
    })

  } catch (error) {
    console.error('❌ Error seeding targets:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
seedTargets()