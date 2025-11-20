import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export interface TheoryDistribution {
  topic: string;
  citations: number;
}

interface TheoryBarChartProps {
  data: TheoryDistribution[];
  title: React.ReactNode;
  colors?: string[];
}

export default function TheoryBarChart({ data, title, colors }: TheoryBarChartProps) {
  const defaultColors = [
    'hsl(280 70% 65%)',
    'hsl(200 75% 60%)',
    'hsl(160 65% 58%)',
    'hsl(25 80% 62%)',
    'hsl(340 70% 63%)',
    'hsl(180 68% 60%)',
    'hsl(240 72% 64%)',
    'hsl(45 75% 60%)',
  ];

  const barColors = colors || defaultColors;

  return (
    <div className="w-full h-full flex flex-col" data-testid="theory-bar-chart">
      <div className="mb-4">
        <h3 className="text-xl font-medium text-foreground">{title}</h3>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.3}
            />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="topic"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--popover-border))',
                borderRadius: '0.375rem',
                fontSize: '12px',
              }}
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
            />
            <Bar
              dataKey="citations"
              radius={[0, 4, 4, 0]}
              animationDuration={400}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={barColors[index % barColors.length]}
                  data-testid={`bar-${index}`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
