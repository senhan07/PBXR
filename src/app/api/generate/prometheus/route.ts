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
        // Ensure timeout is not greater than interval
        const timeoutNum = Math.min(prober.scrapeTimeout || prober.interval, prober.interval)
        
        prometheusYml += `  - job_name: '${jobName}'
    scrape_interval: ${intervalNum}s
    scrape_timeout: ${timeoutNum}s
    metrics_path: /probe
    scheme: http
    file_sd_configs:
      - files:
          - 'blackbox/targets.json'
        refresh_interval: ${refreshInterval}
    relabel_configs:
      # 1. Filter: Only keep targets meant for this specific Probe Server (${prober.name})
      - source_labels: [probe_server]
        regex: ^${prober.name}$
        action: keep

      # 2. Filter: Drop if disabled
      - source_labels: [__tmp_enabled]
        regex: "false"
        action: drop

      # 3. Copy target (google.com) to parameter (?target=google.com)
      - source_labels: [__address__]
        target_label: __param_target
        action: replace

      # 4. Copy module to parameter (?module=icmp)
      - source_labels: [module]
        target_label: __param_module
        action: replace

      # 5. SET INSTANCE: Just copy the target address to the instance label
      - source_labels: [__param_target]
        target_label: instance
        action: replace

      # 6. OPTIONAL: Create a visible label for the Blackbox IP
      - target_label: probe_ip
        replacement: ${prober.address}
        action: replace

      # 7. Finally, point the scrape to the Blackbox Exporter IP
      - target_label: __address__
        replacement: ${prober.address}
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