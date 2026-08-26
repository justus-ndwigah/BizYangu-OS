import { useState } from 'react';
import { BarChart2, TrendingUp, PieChart } from 'lucide-react';
import {
  useGetDailyReport,
  useGetTopProducts,
  useGetCategoryBreakdown,
  getGetDailyReportQueryKey,
  getGetTopProductsQueryKey,
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const COLORS = ['hsl(162 48% 20%)', 'hsl(109 61% 43%)', 'hsl(35 90% 50%)', 'hsl(160 10% 45%)', 'hsl(210 60% 50%)', 'hsl(0 70% 50%)'];

export function Reports() {
  const [days, setDays] = useState(14);

  const { data: dailyData, isLoading: dailyLoading } = useGetDailyReport(
    { days },
    { query: { queryKey: getGetDailyReportQueryKey({ days }) } },
  );
  const { data: topProducts, isLoading: topLoading } = useGetTopProducts(
    { limit: 8 },
    { query: { queryKey: getGetTopProductsQueryKey({ limit: 8 }) } },
  );
  const { data: categories, isLoading: catLoading } = useGetCategoryBreakdown();

  const totalRevenue = dailyData?.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalSales = dailyData?.reduce((s, d) => s + d.salesCount, 0) ?? 0;

  const chartData = (dailyData ?? []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
    revenue: d.revenue,
    sales: d.salesCount,
  }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reports</h1>
          <p className="text-muted-foreground font-medium mt-1">Sales performance and trends</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
                days === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted/40'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Revenue ({days}d)</span>
            </div>
            {dailyLoading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-extrabold text-foreground">{fmt(totalRevenue)}</div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <BarChart2 className="w-4 h-4 text-secondary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Transactions ({days}d)</span>
            </div>
            {dailyLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-extrabold text-secondary">{totalSales}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="p-5 md:p-6 border-b border-border/40 pb-4">
          <CardTitle className="text-lg">Revenue Over Time</CardTitle>
          <CardDescription>Daily sales revenue for the last {days} days</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-4">
          {dailyLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(45 20% 85%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'var(--app-font-mono)' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fontFamily: 'var(--app-font-mono)' }} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(45 20% 85%)', fontFamily: 'var(--app-font-sans)', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="hsl(162 48% 20%)" radius={[6, 6, 0, 0]} maxBarSize={40} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="p-5 border-b border-border/40 pb-4">
            <CardTitle className="text-lg">Top Products</CardTitle>
            <CardDescription>Best sellers by units sold</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topLoading ? (
              <div className="p-5 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            ) : (topProducts ?? []).length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">No sales data yet</div>
            ) : (
              <ul className="divide-y divide-border/30">
                {(topProducts ?? []).map((p, i) => (
                  <li key={p.productId} className="p-4 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0"
                      style={{ background: COLORS[i % COLORS.length] + '18', color: COLORS[i % COLORS.length] }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.productName}</p>
                      <p className="text-xs text-muted-foreground">{p.unitsSold} units sold</p>
                    </div>
                    <span className="font-bold font-mono text-sm text-primary">{fmt(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="p-5 border-b border-border/40 pb-4">
            <CardTitle className="text-lg flex items-center gap-2"><PieChart className="w-4 h-4" /> By Category</CardTitle>
            <CardDescription>Revenue split by product category</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {catLoading ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : (categories ?? []).length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RechartsPieChart>
                  <Pie
                    data={categories}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(categories ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(45 20% 85%)', fontSize: 12 }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
