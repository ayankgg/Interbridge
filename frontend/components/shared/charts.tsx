'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];

interface SeriesPoint {
  name: string;
  value: number;
}

export function SimpleBarChart({
  data,
  height = 280,
  color = '#6366f1',
}: {
  data: SeriesPoint[];
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleLineChart({
  data,
  height = 280,
  color = '#6366f1',
}: {
  data: SeriesPoint[];
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const FUNNEL_COMPLETE = '#6366f1'; // blue — stage reached
const FUNNEL_PENDING = '#f59e0b'; // yellow — no one here yet

/**
 * Hiring-pipeline funnel — stages taper top→bottom and are colored by progress:
 * blue when the stage has been reached (count > 0), yellow when it hasn't yet.
 * Feed it stages in pipeline order (e.g. Pending → Shortlisted → Hired → Rejected).
 */
export function PipelineFunnel({
  data,
  height,
}: {
  data: SeriesPoint[];
  height?: number;
}) {
  // Progressive taper gives the funnel shape regardless of the counts.
  const widths = ['100%', '84%', '68%', '54%', '42%', '32%'];

  return (
    <div className="flex flex-col" style={height ? { minHeight: height } : undefined}>
      <div className="flex flex-1 flex-col items-center gap-1.5 py-2">
        {data.map((d, i) => {
          const complete = d.value > 0;
          return (
            <div
              key={d.name}
              className="flex items-center justify-center rounded-md py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
              style={{ width: widths[i] ?? '28%', backgroundColor: complete ? FUNNEL_COMPLETE : FUNNEL_PENDING }}
              title={`${d.name}: ${d.value} ${complete ? '(complete)' : '(not complete)'}`}
            >
              <span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs">
                {d.value}
              </span>
              {d.name}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-1 flex items-center justify-center gap-4 border-t pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FUNNEL_COMPLETE }} /> Complete
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FUNNEL_PENDING }} /> Not complete
        </span>
      </div>
    </div>
  );
}

export function SimpleDonutChart({
  data,
  height = 280,
}: {
  data: SeriesPoint[];
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-muted-foreground"
      >
        No data yet
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
