import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import YAML from 'yaml';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { prober: string } }
) {
  const proberName = params.prober;

  try {
    const prober = await prisma.proberInstance.findUnique({
      where: { name: proberName, enabled: true },
    });

    if (!prober) {
      return new NextResponse('Prober not found or not enabled', { status: 404 });
    }

    const scrapeConfig = {
      job_name: `int-${prober.interval}s-blackbox-${prober.name.toLowerCase()}`,
      scrape_interval: `${prober.interval}s`,
      // Ensure timeout is valid (prometheus fails if timeout > interval)
      scrape_timeout: `${Math.min(prober.scrapeTimeout, prober.interval)}s`,
      metrics_path: '/probe',
      scheme: 'http',
      file_sd_configs: [
        {
          files: ['blackbox/targets.json'],
          refresh_interval: '1m',
        },
      ],
      relabel_configs: [
        // 1. Filter: Only keep targets meant for this specific Probe Server
        {
          source_labels: ['probe_server'],
          regex: `^${prober.name}$`,
          action: 'keep',
        },
        // 2. Filter: Drop if disabled
        {
          source_labels: ['__tmp_enabled'],
          regex: 'false',
          action: 'drop',
        },
        // 3. Copy target (google.com) to parameter (?target=google.com)
        {
          source_labels: ['__address__'],
          target_label: '__param_target',
          action: 'replace',
        },
        // 4. Copy module to parameter (?module=icmp)
        {
          source_labels: ['module'],
          target_label: '__param_module',
          action: 'replace',
        },
        // 5. SET INSTANCE: Just copy the target address to the instance label
        {
          source_labels: ['__param_target'],
          target_label: 'instance',
          action: 'replace',
        },
        // 6. OPTIONAL: Create a visible label for the Blackbox IP
        {
          target_label: 'probe_ip',
          replacement: prober.address,
          action: 'replace',
        },
        // 7. Finally, point the scrape to the actual Blackbox Exporter IP
        {
          target_label: '__address__',
          replacement: prober.address,
          action: 'replace',
        },
      ],
    };

    const doc = new YAML.Document();
    doc.contents = {
      scrape_configs: [scrapeConfig],
    };

    return new NextResponse(doc.toString(), {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error(`Failed to generate Prometheus config for prober ${proberName}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}