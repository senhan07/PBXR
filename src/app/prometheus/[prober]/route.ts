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
      scrape_timeout: `${prober.scrapeTimeout}s`,
      metrics_path: '/probe',
      scheme: 'http',
      file_sd_configs: [
        {
          files: ['blackbox/targets.json'],
          refresh_interval: '1m',
        },
      ],
      relabel_configs: [
        {
          action: 'labeldrop',
          regex: '^(|__name__)$',
        },
        {
          source_labels: ['__meta_filepath'],
          target_label: '__tmp_json',
          action: 'replace',
        },
        {
          action: 'hashmod',
          source_labels: ['__tmp_json'],
          modulus: 1000000,
          target_label: '__tmp_id',
        },
        {
          action: 'replace',
          source_labels: ['__tmp_json', '__tmp_id'],
          target_label: '__address__',
          replacement: '$1-$2',
        },
        {
          source_labels: ['probe_server'],
          regex: `^${prober.name}$`,
          action: 'keep',
        },
        {
          source_labels: ['__tmp_enabled'],
          regex: 'false',
          action: 'drop',
        },
        {
          action: 'labeldrop',
          regex: '(__tmp_enabled|__tmp_json|__tmp_id)',
        },
        {
          source_labels: ['target'],
          target_label: '__param_target',
          action: 'replace',
        },
        {
          source_labels: ['__param_target', 'probe_server'],
          target_label: 'instance',
          replacement: '$1-$2',
          action: 'replace',
        },
        {
          replacement: prober.address,
          target_label: '__address__',
          action: 'replace',
        },
        {
          source_labels: ['module'],
          target_label: '__param_module',
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
