import { useState } from 'react';
import { Search, Plus, Pencil, Trash2, AlertTriangle, Package } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
} from '@workspace/api-client-react';
import type { Product } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['Grains', 'Sugar & Tea', 'Cooking Oils', 'Dairy', 'Baked Goods', 'Vegetables', 'Spices', 'Cleaning', 'Beverages', 'Electronics', 'General'];

interface ProductForm {
  name: string;
  category: string;
  barcode: string;
  buyPrice: string;
  sellPrice: string;
  stock: string;
  lowStockThreshold: string;
  unit: string;
}

const emptyForm: ProductForm = { name: '', category: 'General', barcode: '', buyPrice: '', sellPrice: '', stock: '0', lowStockThreshold: '5', unit: 'pcs' };

const fmt = (n?: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n ?? 0);

export function Inventory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: products, isLoading } = useListProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const categories = Array.from(new Set(products?.map(p => p.category).filter(Boolean) ?? [])).sort();

  const filtered = (products ?? []).filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, category: p.category ?? 'General', barcode: p.barcode ?? '', buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice), stock: String(p.stock), lowStockThreshold: String(p.lowStockThreshold), unit: (p as unknown as { unit?: string }).unit ?? 'pcs' });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = {
      name: form.name,
      category: form.category,
      barcode: form.barcode.trim() || null,
      buyPrice: Number(form.buyPrice),
      sellPrice: Number(form.sellPrice),
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
      unit: form.unit,
    };
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, data: payload });
        toast({ title: 'Product updated' });
      } else {
        await createProduct.mutateAsync({ data: payload });
        toast({ title: 'Product added' });
      }
      await qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setDialogOpen(false);
    } catch {
      toast({ title: 'Error saving product', variant: 'destructive' });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteProduct.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      toast({ title: 'Product deleted' });
    } catch {
      toast({ title: 'Error deleting product', variant: 'destructive' });
    }
    setDeleteId(null);
  }

  const margin = (p: Product) => p.buyPrice > 0 ? Math.round(((p.sellPrice - p.buyPrice) / p.sellPrice) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground font-medium mt-1">{products?.length ?? 0} products in your catalogue</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl h-11">
          <Plus className="mr-2 w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products…" className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Product Table */}
      <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="font-semibold text-foreground">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or add a new product.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Buy</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Sell</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Margin</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Stock</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map(p => {
                  const isLow = p.stock <= p.lowStockThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{p.name}</div>
                        {isLow && (
                          <div className="flex items-center gap-1 mt-0.5 text-destructive text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" /> Low stock
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <Badge variant="outline" className="text-xs rounded-md font-medium">{p.category ?? '—'}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground text-xs">{fmt(p.buyPrice)}</td>
                      <td className="py-3 px-4 text-right font-bold font-mono">{fmt(p.sellPrice)}</td>
                      <td className="py-3 px-4 text-right hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs rounded-md font-mono font-bold text-secondary border-secondary/30 bg-secondary/5">{margin(p)}%</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold font-mono tabular-nums ${isLow ? 'text-destructive' : 'text-foreground'}`}>{p.stock}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(p)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Product Name</Label>
              <Input className="rounded-xl" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Unga Jogoo 2kg" />
            </div>
            <div className="grid gap-1.5">
              <Label>Barcode (optional)</Label>
              <Input
                className="rounded-xl font-mono"
                value={form.barcode}
                onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                placeholder="Scan or type barcode…"
              />
              <p className="text-xs text-muted-foreground">Click into this field and scan with a USB barcode scanner to fill it automatically.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Unit</Label>
                <Input className="rounded-xl" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="pcs, kg, litre…" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Buy Price (KES)</Label>
                <Input className="rounded-xl font-mono" type="number" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Sell Price (KES)</Label>
                <Input className="rounded-xl font-mono" type="number" value={form.sellPrice} onChange={e => setForm(f => ({ ...f, sellPrice: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Stock</Label>
                <Input className="rounded-xl font-mono" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Low Stock Alert</Label>
                <Input className="rounded-xl font-mono" type="number" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" onClick={handleSave} disabled={!form.name || !form.sellPrice || createProduct.isPending || updateProduct.isPending}>
              {createProduct.isPending || updateProduct.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Delete Product?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the product from your catalogue.</p>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
