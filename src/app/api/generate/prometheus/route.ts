import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Fetch settings and prober instances
    const [settings, probers] = await Promise.all([
      db.settings.findFirst(),
      db.proberInstance.findMany({
        where: { enabled: true },
        orderBy: { interval: 'asc' }
      })
    ])

    if (probers.length === 0) {
      return NextResponse.json(
        { error: 'No enabled prober instances found' },
        { status: 400 }
      )
    }

    // Get refresh interval from settings or use default
    const refreshInterval = settings?.prometheusRefreshInterval || "1m"

    // Group probers by interval to create separate jobs
    const probersByInterval = probers.reduce((acc, prober) => {
      const interval = prober.interval
      if (!acc[interval]) {
        acc[interval] = []
      }
      acc[interval].push(prober)
      return acc
    }, {} as Record<number, any[]>)

    // Generate prometheus.yml content
    let prometheusYml = `# Generated Prometheus configuration for Blackbox monitoring
# Auto-generated on ${new Date().toISOString()}

scrape_configs:
`

    // Create a job for each unique interval
    for (const [interval, intervalProbers] of Object.entries(probersByInterval)) {
      const intervalNum = parseInt(interval)
      
      // Create separate jobs for each prober in this interval group
      for (const prober of intervalProbers) {
        const jobName = `int-${intervalNum}s-blackbox-${prober.name.toLowerCase()}`
        const timeoutNum = Math.min(prober.scrapeTimeout || prober.interval, prober.interval)
        
        prometheusYml += `  - job_name: ${jobName}
    scrape_interval: ${intervalNum}s
    scrape_timeout: ${timeoutNum}s
    metrics_path: /probe
    scheme: http
    file_sd_configs:
    - files:
      - blackbox/targets.json
      refresh_interval: ${refreshInterval}
    relabel_configs:
      # 🛑 DROP CONFLICTING LABELS
      - action: labeldrop
        regex: ^(|__name__)$

      # 🔥 EXPAND PROBES ARRAY INTO MULTIPLE TARGETS
      - source_labels: [__meta_filepath]
        target_label: __tmp_json
        action: replace
      - action: hashmod
        source_labels: [__tmp_json]
        modulus: 1000000
        target_label: __tmp_id
      - action: replace
        source_labels: [__tmp_json, __tmp_id]
        target_label: __address__
        replacement: $1-$2

      # 🔥 FILTER BY PROBE_SERVER ${prober.name.toUpperCase()}
      - source_labels: [probe_server]
        regex: ^${prober.name}$
        action: keep

      # 🔥 DROP DISABLED PROBES
      - source_labels: [__tmp_enabled]
        regex: false
        action: drop

      # CLEAN UP TEMP LABELS
      - action: labeldrop
        regex: (__tmp_enabled|__tmp_json|__tmp_id)

      # SET TARGET PARAM
      - source_labels: [target]
        target_label: __param_target
        action: replace

      # SET INSTANCE
      - source_labels: [__param_target, probe_server]
        target_label: instance
        replacement: $1-$2
        action: replace

      # SET BLACKBOX ADDRESS
      - replacement: ${prober.address}
        target_label: __address__
        action: replace

      # SET MODULE
      - source_labels: [module]
        target_label: __param_module
        action: replace

`
      }
    }

    return NextResponse.json({
      content: prometheusYml,
      filename: 'prometheus.yml',
      probers: probers.map(p => ({
        name: p.name,
        address: p.address,
        interval: p.interval,
        scrapeTimeout: p.scrapeTimeout
      }))
    })

  } catch (error) {
    console.error('Failed to generate prometheus.yml:', error)
    return NextResponse.json(
      { error: 'Failed to generate prometheus.yml' },
      { status: 500 }
    )
  }
}