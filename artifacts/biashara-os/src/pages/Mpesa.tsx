import { useState } from 'react';
import { Smartphone, CheckCircle2, Clock, XCircle, RefreshCw, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListMpesaTransactions,
  useGetMpesaSummary,
  useInitiateMpesaStkPush,
  getListMpesaTransactionsQueryKey,
  getGetMpesaSummaryQueryKey,
} from '@workspace/api-client-react';
import type { MpesaTransaction } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

function StatusBadge({ status }: { status: MpesaTransaction['status'] }) {
  if (status === 'success') return (
    <Badge className="text-xs bg-secondary/10 text-secondary border-secondary/30 font-bold rounded-md gap-1">
      <CheckCircle2 className="w-3 h-3" /> Confirmed
    </Badge>
  );
  if (status === 'failed') return (
    <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/30 font-bold rounded-md gap-1">
      <XCircle className="w-3 h-3" /> Failed
    </Badge>
  );
  return (
    <Badge className="text-xs bg-accent/10 text-accent border-accent/30 font-bold rounded-md gap-1">
      <Clock className="w-3 h-3 animate-pulse" /> Pending
    </Badge>
  );
}

export function Mpesa() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: transactions, isLoading: txLoading } = useListMpesaTransactions();
  const { data: summary, isLoading: sumLoading } = useGetMpesaSummary();
  const initiateStkPush = useInitiateMpesaStkPush();

  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    await qc.invalidateQueries({ queryKey: getListMpesaTransactionsQueryKey() });
    await qc.invalidateQueries({ queryKey: getGetMpesaSummaryQueryKey() });
    setTimeout(() => setIsRefreshing(false), 800);
  }

  async function handleStkPush() {
    if (!phone || !amount) return;
    try {
      await initiateStkPush.mutateAsync({ data: { phone, amount: Number(amount) } });
      await qc.invalidateQueries({ queryKey: getListMpesaTransactionsQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetMpesaSummaryQueryKey() });
      toast({ title: 'STK Push sent', description: `Prompt sent to ${phone}` });
      setPhone('');
      setAmount('');
    } catch {
      toast({ title: 'STK Push failed', variant: 'destructive' });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">M-PESA</h1>
          <p className="text-muted-foreground font-medium mt-1">Payments and reconciliation</p>
        </div>
        <Button variant="outline" className="rounded-xl h-10" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sumLoading ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Confirmed</p>
                <p className="text-2xl font-extrabold text-secondary">{fmt(summary?.totalConfirmed ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Success</p>
                <p className="text-2xl font-extrabold text-secondary">{summary?.confirmedCount ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/60 shadow-sm bg-accent/5 border-accent/20">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pending</p>
                <p className="text-2xl font-extrabold text-accent">{summary?.pendingCount ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/60 shadow-sm bg-destructive/5 border-destructive/20">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Failed</p>
                <p className="text-2xl font-extrabold text-destructive">{summary?.failedCount ?? 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STK Push Form */}
        <Card className="rounded-2xl border-border/60 shadow-sm lg:col-span-1">
          <CardHeader className="p-5 border-b border-border/40 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-secondary" /> Request Payment
            </CardTitle>
            <CardDescription>Send STK push to a customer</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid gap-1.5">
              <Label>Phone Number</Label>
              <Input
                className="rounded-xl font-mono"
                placeholder="07XXXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Amount (KES)</Label>
              <Input
                className="rounded-xl font-mono"
                type="number"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <Button
              className="w-full rounded-xl h-11"
              onClick={handleStkPush}
              disabled={!phone || !amount || initiateStkPush.isPending}
            >
              <Send className="mr-2 w-4 h-4" />
              {initiateStkPush.isPending ? 'Sending…' : 'Send STK Push'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              This is a simulation — no real M-PESA payment is sent
            </p>
          </CardContent>
        </Card>

        {/* Transaction Log */}
        <Card className="rounded-2xl border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="p-5 border-b border-border/40 pb-4">
            <CardTitle className="text-lg">Transaction Log</CardTitle>
            <CardDescription>{transactions?.length ?? 0} transactions recorded</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {txLoading ? (
              <div className="p-5 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : (transactions ?? []).length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No M-PESA transactions yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/30 max-h-96 overflow-y-auto">
                {(transactions ?? []).map(txn => (
                  <li key={txn.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4 text-secondary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground font-mono">{txn.phone}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(txn.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {txn.mpesaReceipt && (
                          <p className="text-xs font-mono text-muted-foreground">{txn.mpesaReceipt}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <p className="font-extrabold font-mono text-foreground">{fmt(txn.amount)}</p>
                      <StatusBadge status={txn.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
