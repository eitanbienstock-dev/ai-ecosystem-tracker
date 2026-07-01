import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Map ai_category + sector_tags to node IDs in the stack diagram
function mapToNodes(aiCategory: string, sectorTags: string[]): string[] {
  const tags = sectorTags.map(t => t.toLowerCase());
  const nodes: string[] = [];

  switch (aiCategory) {
    case 'semiconductors': {
      const isOptical = tags.some(t =>
        ['ai_optical','optical','photonics','transceivers','lasers','interconnect','active_cables','ai_connectivity'].includes(t)
      );
      const isNetworking = tags.some(t =>
        ['networking','data center networking','connectivity'].includes(t)
      );
      const isChip = tags.some(t => ['ai_chips','inference'].includes(t));
      const isFoundrySupport = tags.some(t =>
        ['semiconductor_metrology','process_control','advanced_packaging','semiconductor_test'].includes(t)
      );
      const isMemory = tags.some(t =>
        ['memory','hbm','ddr5','ip_licensing'].includes(t)
      );
      const isFpga = tags.some(t =>
        ['fpga','server_management','edge_ai','ai_servers'].includes(t)
      );
      // Marvell is explicitly named in the broadcom node of the diagram
      const isMarvell = isChip && isOptical && isNetworking;

      if (isMarvell) nodes.push('broadcom');
      if (isOptical || isNetworking) nodes.push('networking');
      if (isChip && !isMarvell) nodes.push('nvidia');
      if (isFoundrySupport) nodes.push('tsmc');
      if (isMemory) { nodes.push('nvidia'); nodes.push('tsmc'); }
      if (isFpga) nodes.push('neoclouds');
      break;
    }
    case 'compute_cloud':
      nodes.push('neoclouds');
      break;
    case 'power_infrastructure':
      nodes.push('power');
      break;
    case 'cybersecurity':
      nodes.push('enterprises');
      break;
    case 'data_layer':
      nodes.push('devtools');
      if (tags.some(t => ['ai training data','model evaluation','data engineering'].includes(t))) {
        nodes.push('ailabs');
      }
      break;
    case 'mlops_tooling':
      nodes.push('devtools');
      break;
    case 'applications':
      nodes.push('enterprises');
      if (tags.some(t => ['agentic ai orchestration','enterprise automation'].includes(t))) {
        nodes.push('devtools');
      }
      break;
    case 'robotics_physical':
      nodes.push('enterprises');
      break;
    case 'foundation_models':
      nodes.push('frontier');
      break;
  }

  return [...new Set(nodes)];
}

function buildFitSummary(c: Record<string, any>): string {
  const parts: string[] = [];

  if (c.description) parts.push(c.description.trim());
  if (c.moat_description) parts.push(c.moat_description.trim());

  const leverage = c.value_capture_direction;
  const trajectory = c.ecosystem_trajectory;
  if (leverage || trajectory) {
    const leverageLabel =
      leverage === 'hard_to_replace' ? 'hard to replace within its layer' :
      leverage === 'commoditized' ? 'operating in a commoditized layer' :
      null;
    const trajectoryLabel =
      trajectory === 'strengthening' ? 'with a strengthening ecosystem position' :
      trajectory === 'weakening' ? 'with a weakening ecosystem position' :
      trajectory === 'stable' ? 'with a stable ecosystem position' :
      null;
    const levers = [leverageLabel, trajectoryLabel].filter(Boolean);
    if (levers.length) parts.push(levers.join(', ') + '.');
  }

  if (!parts.length) {
    return `${c.name} operates in the ${(c.ai_category ?? '').replace(/_/g, ' ')} layer of the AI infrastructure stack.`;
  }

  return parts.join(' ');
}

export async function GET() {
  const { data, error } = await supabase
    .from('companies')
    .select(
      'id, name, ticker, ai_category, sector_tags, research_status, description, moat_description, value_capture_direction, ecosystem_trajectory, scores!inner(composite_score, confidence_score)'
    )
    .in('research_status', ['holding', 'watched'])
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const companies = (data ?? []).map((c: Record<string, any>) => ({
    id: c.id,
    name: c.name,
    ticker: c.ticker,
    research_status: c.research_status,
    ai_category: c.ai_category,
    nodes: mapToNodes(c.ai_category ?? '', c.sector_tags ?? []),
    fit_summary: buildFitSummary(c),
  }));

  return NextResponse.json({ companies });
}
