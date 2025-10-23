import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const targets = await prisma.blackboxTarget.findMany({
      where: {
        enabled: true,
      },
    });

    const probers = await prisma.proberInstance.findMany({
      where: {
        enabled: true,
      },
    });

    const proberMap = new Map(probers.map((p) => [p.name, p]));

    const result = targets
      .map((target) => {
        const probeAssignments = target.probeAssignments
          ? JSON.parse(target.probeAssignments)
          : [];

        if (probeAssignments.length === 0) {
          return null;
        }

        const labels: { module: string; __tmp_enabled: string; [key: string]: string } = {
          module: target.module,
          __tmp_enabled: String(target.enabled),
        };

        if (target.labels) {
          try {
            const parsedLabels = JSON.parse(target.labels);
            Object.assign(labels, parsedLabels);
          } catch (e) {
            console.error(`Failed to parse labels for target ${target.name}: ${target.labels}`);
          }
        }

        return {
          target: target.name,
          labels,
          probes: probeAssignments
            .map((probeName: string) => ({
              probe_server: probeName,
              __tmp_enabled: String(proberMap.has(probeName) && proberMap.get(probeName)!.enabled),
            }))
            .filter((probe: any) => proberMap.has(probe.probe_server)),
        };
      })
      .filter((item) => item !== null && item.probes.length > 0);

    return new NextResponse(JSON.stringify(result, null, 2), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Failed to generate targets JSON:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
