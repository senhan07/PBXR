import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all targets and probers
    // We removed "where: { enabled: true }" so we can generate entries for disabled items too
    const [targets, probers] = await Promise.all([
      db.blackboxTarget.findMany({
        orderBy: { name: 'asc' }
      }),
      db.proberInstance.findMany({
        orderBy: { name: 'asc' }
      })
    ]);

    const proberMap = new Map(probers.map(p => [p.id, p]));

    const result = targets.flatMap(target => {
      // 1. Parse Probe Assignments
      let assignedProbeIds: string[] = [];
      if (target.probeAssignments) {
        try {
          const parsed = JSON.parse(target.probeAssignments);
          if (Array.isArray(parsed)) {
            assignedProbeIds = parsed;
          }
        } catch (e) {
          console.error(`Failed to parse probeAssignments for target ${target.name}:`, e);
          return []; 
        }
      }

      if (assignedProbeIds.length === 0) {
        return [];
      }

      // 2. Parse Custom Labels
      let customLabels: { [key: string]: string } = {};
      if (target.labels) {
        try {
          const parsed = JSON.parse(target.labels);
          if (typeof parsed === 'object' && parsed !== null) {
            customLabels = parsed;
          }
        } catch (e) {
          console.error(`Failed to parse labels for target ${target.name}:`, e);
        }
      }

      // 3. Handle Label Overrides
      // We extract __tmp_enabled from custom labels so we can use it for logic
      // and then delete it from the object so it doesn't get added twice.
      let labelOverride = customLabels['__tmp_enabled'];
      delete customLabels['__tmp_enabled']; 

      return assignedProbeIds
        .map(probeId => {
          const prober = proberMap.get(probeId);
          if (!prober) return null;

          // 4. Calculate Final Status
          // Start with Database status
          let isEnabled = target.enabled && prober.enabled;

          // If custom label explicitly says "false", force it to false
          if (labelOverride === 'false') {
            isEnabled = false;
          }

          return {
            targets: [target.url],
            labels: {
              module: target.module,
              short_name: target.name,
              ...customLabels, // Spread remaining custom labels (without __tmp_enabled)
              probe_server: prober.name,
              __tmp_enabled: isEnabled.toString() // Set the final calculated value
            }
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    });

    return NextResponse.json(result, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Failed to generate targets JSON:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}