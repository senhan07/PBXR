import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all enabled targets and probers
    const [targets, probers] = await Promise.all([
      db.blackboxTarget.findMany({
        where: { enabled: true },
        orderBy: { name: 'asc' }
      }),
      db.proberInstance.findMany({
        where: { enabled: true },
        orderBy: { name: 'asc' }
      })
    ]);

    // Create a map of prober IDs to prober names for efficient lookup
    const proberIdToNameMap = new Map(probers.map(p => [p.id, p.name]));

    // Generate the JSON content
    const result = targets
      .map(target => {
        // Ensure probeAssignments is a valid JSON array of IDs
        let assignedProbeIds: string[] = [];
        if (target.probeAssignments) {
          try {
            const parsedAssignments = JSON.parse(target.probeAssignments);
            if (Array.isArray(parsedAssignments)) {
              assignedProbeIds = parsedAssignments;
            }
          } catch (e) {
            console.error(`Failed to parse probeAssignments for target ${target.name}:`, e);
            return null; // Skip this target if assignments are malformed
          }
        }

        // If there are no assigned probes, skip this target
        if (assignedProbeIds.length === 0) {
          return null;
        }

        // Parse labels from the JSON string
        let labels: { [key: string]: string } = {};
        if (target.labels) {
          try {
            const parsedLabels = JSON.parse(target.labels);
            if (typeof parsedLabels === 'object' && parsedLabels !== null) {
              labels = parsedLabels;
            }
          } catch (e) {
            console.error(`Failed to parse labels for target ${target.name}:`, e);
            // Optionally, handle this case, e.g., by skipping or using default labels
          }
        }

        // Map assigned probe IDs to the required structure
        const targetProbes = assignedProbeIds
          .map(probeId => {
            const probeName = proberIdToNameMap.get(probeId);
            if (probeName) {
              return {
                probe_server: probeName,
                __tmp_enabled: "true" // Target and Prober are both enabled
              };
            }
            return null;
          })
          .filter(p => p !== null); // Filter out any nulls if an ID was not found

        // If after filtering, there are no valid probes, skip the target
        if (targetProbes.length === 0) {
          return null;
        }

        return {
          target: target.name,
          labels: {
            module: target.module,
            ...labels,
            __tmp_enabled: 'true' // Target is enabled
          },
          probes: targetProbes
        };
      })
      .filter(item => item !== null); // Filter out any targets that were skipped

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