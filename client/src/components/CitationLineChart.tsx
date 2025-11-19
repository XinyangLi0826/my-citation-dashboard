import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface CitationDataPoint {
  month: string;
  citations: number;
}

export interface SeriesData {
  name: string;
  color: string;
  data: CitationDataPoint[];
}

interface CitationLineChartProps {
  data?: CitationDataPoint[];
  multiSeriesData?: SeriesData[];
  title: string;
  color?: string;
  onReset?: () => void;
}

export default function CitationLineChart({ data, multiSeriesData, title, color = 'hsl(var(--chart-1))', onReset }: CitationLineChartProps) {
  // Use multi-series mode if provided, otherwise single-series mode
  const isMultiSeries = multiSeriesData && multiSeriesData.length > 0;
  
  // Prepare chart data based on mode
  let chartData: any[] = [];
  if (isMultiSeries) {
    // Combine all series into single dataset with multiple value columns
    const allMonths = new Set<string>();
    multiSeriesData.forEach(series => {
      series.data.forEach(d => allMonths.add(d.month));
    });
    
    // Track last known cumulative value for each series to carry forward
    const lastKnownValues: { [key: string]: number } = {};
    multiSeriesData.forEach(series => {
      lastKnownValues[series.name] = 0;
    });
    
    chartData = Array.from(allMonths).sort().map(month => {
      const dataPoint: any = { month };
      multiSeriesData.forEach(series => {
        const point = series.data.find(d => d.month === month);
        if (point) {
          // Found data for this month - update last known value
          lastKnownValues[series.name] = point.citations;
        }
        // Use last known value (carries forward if no data this month)
        dataPoint[series.name] = lastKnownValues[series.name];
      });
      return dataPoint;
    });
  } else if (data) {
    chartData = data;
  }
  return (
    <div className="w-full h-full flex flex-col" data-testid="citation-line-chart">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-medium text-foreground">{title}</h3>
        {isMultiSeries && onReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            data-testid="button-reset-chart"
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Reset to Overall View
          </Button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.3}
            />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{ 
                value: 'Citation Count', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--popover-border))',
                borderRadius: '0.375rem',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
            />
            {isMultiSeries && (
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="line"
              />
            )}
            {isMultiSeries ? (
              // Multi-series mode: render multiple lines
              multiSeriesData.map((series, idx) => (
                <Line
                  key={series.name}
                  type="monotone"
                  dataKey={series.name}
                  stroke={series.color}
                  strokeWidth={2.5}
                  dot={{ fill: series.color, r: 4 }}
                  activeDot={{ r: 6 }}
                  animationDuration={400}
                  animationEasing="ease-in-out"
                  connectNulls={true}
                  data-testid={`line-${idx}`}
                />
              ))
            ) : (
              // Single-series mode: render one line
              <Line
                type="monotone"
                dataKey="citations"
                stroke={color}
                strokeWidth={3}
                dot={{ fill: color, r: 5, strokeWidth: 2, stroke: color }}
                activeDot={{ r: 7, strokeWidth: 2 }}
                animationDuration={400}
                animationEasing="ease-in-out"
                connectNulls={true}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
