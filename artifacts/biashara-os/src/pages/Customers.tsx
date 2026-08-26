import { useState } from 'react';
import { Search, Plus, Users, Phone, ChevronRight, CheckCircle, Trash2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useListCustomerDebts,
  useSettleDebt,
  getListCustomersQueryKey,
  getListCustomerDebtsQueryKey,
  getGetDebtsSummaryQueryKey,
} from '@workspace/api-client-react';
import type { Customer, Debt } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

function CustomerDebts({ customerId }: { customerId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: debts, isLoading } = useListCustomerDebts(customerId, {
    query: { queryKey: getListCustomerDebtsQueryKey(customerId) },
  });
  const settleDebt = useSettleDebt();

  async function handleSettle(debtId: number) {
    try {
      await settleDebt.mutateAsync({ debtId });
      await qc.invalidateQueries({ queryKey: getListCustomerDebtsQueryKey(customerId) });
      await qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetDebtsSummaryQueryKey() });
      toast({ title: 'Debt marked as settled' });
    } catch {
      toast({ title: 'Error settling debt', variant: 'destructive' });
    }
  }

  if (isLoading) return <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>;

  const outstanding = debts?.filter(d => !d.settled) ?? [];
  const settled = debts?.filter(d => d.settled) ?? [];

  return (
    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
      {outstanding.length === 0 && settled.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-secondary opacity-60" />
          <p>No debts recorded</p>
        </div>
      )}
      {outstanding.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Outstanding</p>
          <ul className="space-y-2">
            {outstanding.map(d => (
              <li key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/5 border border-accent/20">
                <div>
                  <p className="font-bold text-sm text-foreground">{fmt(d.amount)}</p>
                  {d.note && <p className="text-xs text-muted-foreground mt-0.5">{d.note}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(d.createdAt).toLocaleDateString('en-KE')}</p>
                </div>
                <Button size="sm" variant="outline" className="rounded-lg text-xs h-8 border-secondary/30 text-secondary hover:bg-secondary/10" onClick={() => handleSettle(d.id)}>
                  <CheckCircle className="w-3 h-3 mr-1" /> Settle
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {settled.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Settled</p>
          <ul className="space-y-2">
            {settled.map(d => (
              <li key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                <div>
                  <p className="font-bold text-sm text-muted-foreground line-through">{fmt(d.amount)}</p>
                  {d.note && <p className="text-xs text-muted-foreground mt-0.5">{d.note}</p>}
                </div>
                <Badge variant="outline" className="text-xs rounded-md text-secondary border-secondary/30 font-bold">Settled</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Customers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: customers, isLoading } = useListCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = (customers ?? []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  ).sort((a, b) => b.totalDebt - a.totalDebt);

  const totalDebt = filtered.reduce((s, c) => s + c.totalDebt, 0);
  const debtors = filtered.filter(c => c.totalDebt > 0).length;

  function openCreate() {
    setEditing(null); setName(''); setPhone(''); setDialogOpen(true);
  }
  function openEdit(c: Customer) {
    setEditing(c); setName(c.name); setPhone(c.phone ?? ''); setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editing) {
        await updateCustomer.mutateAsync({ id: editing.id, data: { name, phone: phone || undefined } });
        toast({ title: 'Customer updated' });
      } else {
        await createCustomer.mutateAsync({ data: { name, phone: phone || undefined } });
        toast({ title: 'Customer added' });
      }
      await qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      setDialogOpen(false);
    } catch {
      toast({ title: 'Error saving customer', variant: 'destructive' });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCustomer.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      toast({ title: 'Customer deleted' });
    } catch {
      toast({ title: 'Error deleting customer', variant: 'destructive' });
    }
    setDeleteId(null);
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Customers</h1>
          <p className="text-muted-foreground font-medium mt-1">{customers?.length ?? 0} customers · {debtors} with debt</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl h-11"><Plus className="mr-2 w-4 h-4" /> Add Customer</Button>
      </div>

      {/* Summary */}
      {debtors > 0 && (
        <Card className="rounded-2xl border-accent/30 bg-accent/5 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertCircle className="w-8 h-8 text-accent shrink-0" />
            <div>
              <p className="font-bold text-foreground">{fmt(totalDebt)} total outstanding</p>
              <p className="text-sm text-muted-foreground">{debtors} customer{debtors > 1 ? 's' : ''} owe money</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search customers…" className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="font-semibold text-foreground">No customers yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your regular customers to track debts.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {filtered.map(c => (
              <li key={c.id} className="p-4 hover:bg-muted/20 transition-colors flex items-center justify-between gap-3 group">
                <button className="flex items-center gap-3 flex-1 text-left" onClick={() => setSelectedCustomer(c)}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{c.name}</p>
                    {c.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right mr-2">
                    {c.totalDebt > 0 ? (
                      <Badge className="bg-accent/15 text-accent border-accent/30 font-bold font-mono text-xs rounded-md">{fmt(c.totalDebt)}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs rounded-md text-secondary border-secondary/30 font-bold">Clear</Badge>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                </button>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(c)}>
                    <Search className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Customer Debt Detail Dialog */}
      <Dialog open={selectedCustomer !== null} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedCustomer?.phone ?? 'No phone'}</p>
          </DialogHeader>
          {selectedCustomer && (
            <div>
              <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-muted/30">
                <span className="text-sm font-medium text-muted-foreground">Total Outstanding</span>
                <span className={`font-extrabold font-mono ${selectedCustomer.totalDebt > 0 ? 'text-accent' : 'text-secondary'}`}>
                  {fmt(selectedCustomer.totalDebt)}
                </span>
              </div>
              <CustomerDebts customerId={selectedCustomer.id} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedCustomer(null)}>Close</Button>
            <Button className="rounded-xl" onClick={() => { setSelectedCustomer(null); openEdit(selectedCustomer!); }}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Full Name</Label>
              <Input className="rounded-xl" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mama Wanjiku" />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone (optional)</Label>
              <Input className="rounded-xl" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" onClick={handleSave} disabled={!name || createCustomer.isPending || updateCustomer.isPending}>
              {createCustomer.isPending || updateCustomer.isPending ? 'Saving…' : editing ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Delete Customer?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will remove the customer and their debt history.</p>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
