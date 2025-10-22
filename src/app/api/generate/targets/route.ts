import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Fetch all targets and probers
    const [targets, probers] = await Promise.all([
      db.blackboxTarget.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      db.proberInstance.findMany({
        where: { enabled: true },
        orderBy: { name: 'asc' }
      })
    ])

    if (probers.length === 0) {
      return NextResponse.json(
        { error: 'No enabled prober instances found' },
        { status: 400 }
      )
    }

    // Generate targets.json content
    const targetsJson = targets
      .filter(target => {
        // Only include targets that have probe assignments
        if (!target.probeAssignments) return false
        
        try {
          const assignedProbeIds = JSON.parse(target.probeAssignments)
          return Array.isArray(assignedProbeIds) && assignedProbeIds.length > 0
        } catch (e) {
          return false
        }
      })
      .map(target => {
      // Parse labels
      let labels = {}
      if (target.labels) {
        try {
          labels = JSON.parse(target.labels)
        } catch (e) {
          // Fallback for comma-separated labels
          const labelPairs = target.labels.split(',').map((pair: string) => pair.trim())
          labelPairs.forEach((pair: string) => {
            const [key, value] = pair.split('=').map((s: string) => s.trim())
            if (key && value) {
              labels[key] = value
            }
          })
        }
      }

      // Parse probe assignments
      let probes = []
      if (target.probeAssignments) {
        try {
          const assignedProbeIds = JSON.parse(target.probeAssignments)
          if (Array.isArray(assignedProbeIds)) {
            // Map probe IDs to probe names
            probes = assignedProbeIds.map(probeId => {
              const prober = probers.find(p => p.id === probeId)
              if (prober) {
                return {
                  probe_server: prober.name,
                  __tmp_enabled: "true"
                }
              }
              return null
            }).filter(Boolean)
          }
        } catch (e) {
          console.error('Failed to parse probe assignments for target', target.name, e)
          // If parsing fails, don't assign to any probers
          probes = []
        }
      }
      // If no probe assignments, leave empty array (don't assign to all probers)

      return {
        target: target.name,
        labels: {
          module: target.module,
          ...labels
        },
        probes: probes
      }
    })

    return NextResponse.json({
      content: JSON.stringify(targetsJson, null, 2),
      filename: 'targets.json',
      targets: targetsJson,
      probers: probers.map(p => ({
        name: p.name,
        address: p.address,
        interval: p.interval
      }))
    })

  } catch (error) {
    console.error('Failed to generate targets.json:', error)
    return NextResponse.json(
      { error: 'Failed to generate targets.json' },
      { status: 500 }
    )
  }
}