import { format } from 'date-fns';
import { 
  ArrowUpRight, 
  TrendingUp, 
  PackageMinus, 
  Clock, 
  Wallet,
  ArrowRight,
  AlertCircle,
  Users
} from 'lucide-react';
import { Link } from 'wouter';
import { 
  useGetSalesStats, 
  useListSales, 
  useListLowStockProducts 
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetSalesStats();
  
  // Get today's date in YYYY-MM-DD format
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: recentSales, isLoading: salesLoading } = useListSales({ date: today });
  
  const { data: lowStock, isLoading: lowStockLoading } = useListLowStockProducts();

  const formatMoney = (amount?: number) => {
    if (amount === undefined) return 'KSh 0';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Leo ni Leo
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            {format(new Date(), 'EEEE, do MMMM yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/record-sale" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 rounded-xl">
            <Wallet className="mr-2 w-4 h-4" />
            New Sale
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Sales</span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl md:text-3xl font-extrabold text-foreground">
                {formatMoney(stats?.todayRevenue)}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2 font-medium">
              {stats?.todaySalesCount || 0} transactions
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <ArrowUpRight className="w-4 h-4 text-secondary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Est. Profit</span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl md:text-3xl font-extrabold text-secondary">
                {formatMoney(stats?.todayProfit)}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2 font-medium">
              {formatMoney(stats?.monthProfit)} this month
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm bg-accent/5 border-accent/20">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 text-accent-foreground mb-2">
              <Wallet className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-foreground/80">Unpaid Debt</span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-24 bg-accent/20" />
            ) : (
              <div className="text-2xl md:text-3xl font-extrabold text-accent">
                {formatMoney(stats?.totalOutstandingDebt)}
              </div>
            )}
            <Link href="/customers" className="text-xs text-accent hover:underline font-bold flex items-center gap-1 mt-2 inline-flex">
              View debtors <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm bg-destructive/5 border-destructive/20">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <PackageMinus className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Low Stock</span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-12 bg-destructive/20" />
            ) : (
              <div className="text-2xl md:text-3xl font-extrabold text-destructive">
                {stats?.lowStockCount || 0}
              </div>
            )}
            <Link href="/inventory" className="text-xs text-destructive hover:underline font-bold flex items-center gap-1 mt-2 inline-flex">
              Restock needed <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Recent Sales Feed */}
        <Card className="lg:col-span-2 rounded-2xl border-border/60 shadow-sm flex flex-col">
          <CardHeader className="p-5 md:p-6 border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Sales</CardTitle>
                <CardDescription>Transactions from today</CardDescription>
              </div>
              <Link href="/reports" className="text-sm font-bold text-primary hover:underline flex items-center">
                All reports
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            {salesLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : recentSales?.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-semibold text-foreground">No sales yet today</p>
                <p className="text-sm mt-1 mb-4">Record your first sale to see it here.</p>
                <Link href="/record-sale" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 rounded-xl">
                  Record Sale
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {recentSales?.slice(0, 10).map((sale) => (
                  <li key={sale.id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-card border border-border flex flex-col items-center justify-center text-xs font-mono text-muted-foreground shadow-sm">
                        <span className="font-bold text-foreground text-sm leading-none mb-1">
                          {format(new Date(sale.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm md:text-base">
                          {sale.items.length} items
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] font-mono rounded-md py-0 font-bold bg-background">
                            {sale.receiptNumber}
                          </Badge>
                          {sale.method === 'M-PESA' && (
                            <Badge className="text-[10px] bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-md py-0 font-bold">M-PESA</Badge>
                          )}
                          {sale.onCredit && (
                            <Badge className="text-[10px] bg-accent text-accent-foreground hover:bg-accent/90 rounded-md py-0 font-bold">CREDIT</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-foreground text-base md:text-lg">
                        {formatMoney(sale.total)}
                      </p>
                      {sale.customerName && (
                        <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center justify-end gap-1">
                          <Users className="w-3 h-3" /> {sale.customerName}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          {recentSales && recentSales.length > 0 && (
             <div className="p-4 border-t border-border/40 bg-muted/20 text-center">
               <span className="text-xs font-medium text-muted-foreground">Showing latest transactions</span>
             </div>
          )}
        </Card>

        {/* Low Stock Alerts */}
        <Card className="rounded-2xl border-border/60 shadow-sm flex flex-col border-t-4 border-t-destructive">
          <CardHeader className="p-5 md:p-6 pb-2">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertCircle className="w-5 h-5" />
              <CardTitle className="text-lg">Restock Alerts</CardTitle>
            </div>
            <CardDescription>Items running low</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {lowStockLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : lowStock?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="font-medium text-foreground">Stock looks good!</p>
                <p className="text-sm mt-1">No items are below threshold.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {lowStock?.slice(0, 5).map((product) => (
                  <li key={product.id} className="p-4 md:p-5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-1">
                        Threshold: {product.lowStockThreshold}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="font-extrabold rounded-md font-mono px-2 py-0.5">
                        {product.stock} left
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          {lowStock && lowStock.length > 5 && (
            <div className="p-4 border-t border-border/40">
              <Link href="/inventory" className="text-sm font-bold text-primary hover:underline text-center block w-full">
                View {lowStock.length - 5} more
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
