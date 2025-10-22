import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function showDataSummary() {
  try {
    console.log('📊 Current Database Summary')
    console.log('================================')

    // Count targets
    const targetCount = await prisma.blackboxTarget.count()
    const enabledTargets = await prisma.blackboxTarget.count({ where: { enabled: true } })
    const disabledTargets = await prisma.blackboxTarget.count({ where: { enabled: false } })

    console.log(`\n🎯 Targets:`)
    console.log(`   Total: ${targetCount}`)
    console.log(`   Enabled: ${enabledTargets}`)
    console.log(`   Disabled: ${disabledTargets}`)

    // Show unique values
    const targets = await prisma.blackboxTarget.findMany({
      select: {
        protocol: true,
        module: true
      }
    })

    const protocols = [...new Set(targets.map(t => t.protocol).filter(Boolean))]
    const modules = [...new Set(targets.map(t => t.module))]

    console.log(`\n🔧 Protocols: ${protocols.join(', ')}`)
    console.log(`📦 Modules: ${modules.join(', ')}`)

    // Show sample targets
    const sampleTargets = await prisma.blackboxTarget.findMany({
      take: 5,
      select: {
        name: true,
        url: true,
        enabled: true,
        protocol: true,
        module: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`\n🔍 Sample Targets (Latest 5):`)
    sampleTargets.forEach((target, index) => {
      const status = target.enabled ? '✅' : '❌'
      console.log(`   ${index + 1}. ${target.name} (${target.url}) - ${status}`)
      console.log(`      Protocol: ${target.protocol}, Module: ${target.module}`)
    })

    // Count probers
    const proberCount = await prisma.proberInstance.count()
    const enabledProbers = await prisma.proberInstance.count({ where: { enabled: true } })

    console.log(`\n🔌 Probers:`)
    console.log(`   Total: ${proberCount}`)
    console.log(`   Enabled: ${enabledProbers}`)

    // Count users
    const userCount = await prisma.user.count()

    console.log(`\n👥 Users:`)
    console.log(`   Total: ${userCount}`)

  } catch (error) {
    console.error('❌ Error fetching data summary:', error)
  } finally {
    await prisma.$disconnect()
  }
}

showDataSummary()