import { useState } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Smartphone, Printer } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListProducts,
  useListCustomers,
  useCreateSale,
  useGetSettings,
  getListSalesQueryKey,
  getGetSalesStatsQueryKey,
} from '@workspace/api-client-react';
import type { Product, Customer, Sale } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Receipt } from '@/components/Receipt';

interface CartItem {
  product: Product;
  qty: number;
}

type PayMethod = 'Cash' | 'M-PESA' | 'Credit';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

export function RecordSale() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: products, isLoading: productsLoading } = useListProducts();
  const { data: customers } = useListCustomers();
  const { data: settings } = useGetSettings();
  const createSale = useCreateSale();

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<PayMethod>('Cash');
  const [customerId, setCustomerId] = useState<string>('');
  const [mpesaRef, setMpesaRef] = useState('');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const filtered = (products ?? []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  }

  function setQty(productId: number, qty: number) {
    if (qty <= 0) { setCart(c => c.filter(i => i.product.id !== productId)); return; }
    setCart(c => c.map(i => i.product.id === productId ? { ...i, qty } : i));
  }

  function removeFromCart(productId: number) {
    setCart(c => c.filter(i => i.product.id !== productId));
  }

  const total = cart.reduce((sum, i) => sum + i.product.sellPrice * i.qty, 0);

  async function handleSubmit() {
    if (cart.length === 0) return;
    const selectedCustomer = customers?.find(c => String(c.id) === customerId);
    try {
      const sale = await createSale.mutateAsync({
        data: {
          items: cart.map(i => ({
            productId: i.product.id,
            name: i.product.name,
            qty: i.qty,
            price: i.product.sellPrice,
          })),
          total,
          method,
          onCredit: method === 'Credit',
          customerId: selectedCustomer?.id ?? null,
          mpesaRef: method === 'M-PESA' ? mpesaRef || null : null,
        },
      });
      await qc.invalidateQueries({ queryKey: getListSalesQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetSalesStatsQueryKey() });
      setCompletedSale(sale);
      setCart([]);
      setMethod('Cash');
      setCustomerId('');
      setMpesaRef('');
    } catch {
      toast({ title: 'Failed to record sale', variant: 'destructive' });
    }
  }

  if (completedSale) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Card className="rounded-2xl border-border/60 shadow-sm text-center p-12 print:hidden">
          <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-secondary" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground">Sale Recorded!</h2>
          <p className="text-muted-foreground mt-2 font-medium">Receipt: <span className="font-mono font-bold text-foreground">{completedSale.receiptNumber}</span></p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Button variant="outline" className="rounded-xl h-12 px-8 text-base" onClick={() => window.print()}>
              <Printer className="mr-2 w-4 h-4" />
              Print / Save Receipt (PDF)
            </Button>
            <Button className="rounded-xl h-12 px-8 text-base" onClick={() => setCompletedSale(null)}>
              New Sale
            </Button>
          </div>
        </Card>

        {/* Hidden on screen (see .receipt-print-area / @media print rules),
            only rendered so window.print() has something to output. */}
        <div className="hidden print:block">
          <Receipt sale={completedSale} settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Record Sale</h1>
        <p className="text-muted-foreground font-medium mt-1">Add items, choose payment, and submit</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Catalogue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products…" className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {filtered.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const outOfStock = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => !outOfStock && addToCart(p)}
                    disabled={outOfStock}
                    className={`text-left p-3 rounded-xl border transition-all duration-150 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      inCart
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : outOfStock
                        ? 'border-border/30 bg-muted/20 opacity-50 cursor-not-allowed'
                        : 'border-border hover:border-primary/40 hover:bg-muted/20 cursor-pointer'
                    }`}
                  >
                    <p className="font-semibold text-sm text-foreground leading-snug line-clamp-2">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-extrabold font-mono text-primary">{fmt(p.sellPrice)}</span>
                      {inCart && <Badge className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0 rounded-md font-bold">×{inCart.qty}</Badge>}
                    </div>
                    {outOfStock && <p className="text-xs text-destructive font-bold mt-1">Out of stock</p>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart & Checkout */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Cart {cart.length > 0 && <Badge className="ml-1 text-xs bg-primary text-primary-foreground">{cart.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Tap products to add them</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/30 max-h-72 overflow-y-auto">
                  {cart.map(item => (
                    <li key={item.product.id} className="p-3 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{fmt(item.product.sellPrice)} ea</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(item.product.id, item.qty - 1)} className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold tabular-nums">{item.qty}</span>
                        <button onClick={() => setQty(item.product.id, item.qty + 1)} className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeFromCart(item.product.id)} className="w-6 h-6 rounded-md text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors ml-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="text-2xl font-extrabold text-foreground font-mono">{fmt(total)}</div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Method</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Cash', 'M-PESA', 'Credit'] as PayMethod[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-colors border ${
                        method === m
                          ? m === 'M-PESA' ? 'bg-secondary text-secondary-foreground border-secondary'
                          : m === 'Credit' ? 'bg-accent text-accent-foreground border-accent'
                          : 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted/40'
                      }`}
                    >
                      {m === 'M-PESA' && <Smartphone className="w-3 h-3 mx-auto mb-0.5" />}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {method === 'M-PESA' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">M-PESA Ref (optional)</p>
                  <Input className="rounded-xl h-9 text-sm font-mono" placeholder="e.g. MP1A2B3C4D" value={mpesaRef} onChange={e => setMpesaRef(e.target.value)} />
                </div>
              )}

              {method === 'Credit' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Customer</p>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {(customers ?? []).map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} {c.totalDebt > 0 && `(owes ${fmt(c.totalDebt)})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                className="w-full rounded-xl h-12 text-base font-bold mt-2"
                onClick={handleSubmit}
                disabled={cart.length === 0 || createSale.isPending || (method === 'Credit' && !customerId)}
              >
                {createSale.isPending ? 'Recording…' : `Complete Sale · ${fmt(total)}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
