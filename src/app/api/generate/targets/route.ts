import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Fetch all targets and probers
    // We fetch ALL (removed enabled: true) to handle the logic manually
    const [targets, probers] = await Promise.all([
      db.blackboxTarget.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      db.proberInstance.findMany({
        orderBy: { name: 'asc' }
      })
    ])

    if (probers.length === 0) {
      return NextResponse.json(
        { error: 'No prober instances found' },
        { status: 400 }
      )
    }

    // Create a map for fast prober lookup
    const proberMap = new Map(probers.map(p => [p.id, p]))

    // Generate the Flattened JSON content
    const targetsJson = targets.flatMap(target => {
      // 1. Parse Probe Assignments
      if (!target.probeAssignments) return []
      
      let assignedProbeIds: string[] = []
      try {
        const parsed = JSON.parse(target.probeAssignments)
        if (Array.isArray(parsed)) {
          assignedProbeIds = parsed
        }
      } catch (e) {
        return [] // Skip malformed assignments
      }

      if (assignedProbeIds.length === 0) return []

      // 2. Parse Labels (Support JSON or Comma-Separated)
      let customLabels: { [key: string]: string } = {}
      if (target.labels) {
        try {
          // Try JSON first
          const parsed = JSON.parse(target.labels)
          if (typeof parsed === 'object' && parsed !== null) {
            customLabels = parsed
          }
        } catch (e) {
          // Fallback: Comma-separated (e.g., "zone=int, app=web")
          const labelPairs = target.labels.split(',').map((pair: string) => pair.trim())
          labelPairs.forEach((pair: string) => {
            const [key, value] = pair.split('=').map((s: string) => s.trim())
            if (key && value) {
              customLabels[key] = value
            }
          })
        }
      }

      // 3. Handle Label Override for Enabled Status
      // Extract __tmp_enabled from custom labels if it exists
      let labelOverride = customLabels['__tmp_enabled']
      delete customLabels['__tmp_enabled'] // Remove so it doesn't duplicate

      // 4. Create one entry per assigned Probe
      return assignedProbeIds.map(probeId => {
        const prober = proberMap.get(probeId)
        
        if (!prober) return null

        // Calculate Enabled Status
        // Default: True only if both Target and Prober are enabled
        let isEnabled = target.enabled && prober.enabled

        // Override: If label explicitly says "false", force false
        if (labelOverride === 'false') {
          isEnabled = false
        }

        return {
          targets: [target.url], // The actual address to probe
          labels: {
            module: target.module,
            short_name: target.name, // The display name
            ...customLabels,         // User defined labels
            probe_server: prober.name,
            __tmp_enabled: isEnabled.toString()
          }
        }
      }).filter((item): item is NonNullable<typeof item> => item !== null)
    })

    return NextResponse.json({
      content: JSON.stringify(targetsJson, null, 2),
      filename: 'targets.json',
      targets: targetsJson,
      probers: probers.filter(p => p.enabled).map(p => ({
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