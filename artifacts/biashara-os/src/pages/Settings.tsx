import { useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Users as UsersIcon,
  DatabaseBackup,
  Plus,
  Trash2,
  ShieldCheck,
  Download,
  Upload,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  useGetSettings,
  useUpdateSettings,
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  exportBackup as exportBackupRequest,
  useImportBackup,
  useChangePassword,
  getGetSettingsQueryKey,
  getListUsersQueryKey,
} from '@workspace/api-client-react';
import { useAuth } from '@workspace/auth-web';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

function ShopProfileTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<Record<string, string>>({});

  if (isLoading || !settings) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  const value = (key: string, fallback: string | null | undefined) => form[key] ?? fallback ?? '';

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({
        data: {
          shopName: value('shopName', settings!.shopName),
          ownerName: value('ownerName', settings!.ownerName) || null,
          phone: value('phone', settings!.phone) || null,
          address: value('address', settings!.address) || null,
          currency: value('currency', settings!.currency),
          receiptFooter: value('receiptFooter', settings!.receiptFooter) || null,
        },
      });
      await qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: 'Shop settings saved' });
    } catch {
      toast({ title: 'Could not save settings', variant: 'destructive' });
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Store className="w-5 h-5 text-primary" /> Shop Profile</CardTitle>
        <CardDescription>Shown on receipts and used across the app.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label>Shop name</Label>
            <Input className="rounded-xl" value={value('shopName', settings.shopName)} onChange={(e) => setForm((f) => ({ ...f, shopName: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Owner name</Label>
            <Input className="rounded-xl" value={value('ownerName', settings.ownerName)} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input className="rounded-xl" value={value('phone', settings.phone)} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input className="rounded-xl" value={value('currency', settings.currency)} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address / location</Label>
            <Input className="rounded-xl" value={value('address', settings.address)} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Receipt footer message</Label>
            <Input className="rounded-xl" value={value('receiptFooter', settings.receiptFooter)} onChange={(e) => setForm((f) => ({ ...f, receiptFooter: e.target.value }))} />
          </div>
          <Button type="submit" className="rounded-xl font-bold" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user: me } = useAuth();
  const { data: users, isLoading } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'cashier' as 'admin' | 'cashier' });

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await createUser.mutateAsync({ data: form });
      await qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'cashier' });
      toast({ title: 'Staff account created' });
    } catch {
      toast({ title: 'Could not create user', variant: 'destructive' });
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await updateUser.mutateAsync({ id, data: { isActive: !isActive } });
      await qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch {
      toast({ title: 'Could not update user', variant: 'destructive' });
    }
  }

  async function handleRemove(id: string) {
    try {
      await deactivateUser.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: 'User removed' });
    } catch {
      toast({ title: 'Could not remove user', variant: 'destructive' });
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><UsersIcon className="w-5 h-5 text-primary" /> Staff accounts</CardTitle>
          <CardDescription>Admins manage settings & staff. Cashiers can record sales and view stock.</CardDescription>
        </div>
        <Button size="sm" className="rounded-xl" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add staff
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : (
          <ul className="divide-y divide-border/40">
            {users?.map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{u.firstName} {u.lastName} {u.id === me?.id && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.role === 'admin' ? 'default' : 'outline'} className="text-[10px] font-bold uppercase">{u.role}</Badge>
                  <Badge variant={u.isActive ? 'outline' : 'destructive'} className="text-[10px] font-bold uppercase">{u.isActive ? 'Active' : 'Disabled'}</Badge>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => toggleActive(u.id, u.isActive)} disabled={u.id === me?.id}>
                    {u.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRemove(u.id)} disabled={u.id === me?.id}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add staff account</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input className="rounded-xl" placeholder="First name" required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              <Input className="rounded-xl" placeholder="Last name" required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <Input className="rounded-xl" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input className="rounded-xl" type="password" placeholder="Temporary password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as 'admin' | 'cashier' }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button type="submit" className="rounded-xl font-bold" disabled={createUser.isPending}>
                {createUser.isPending ? 'Creating…' : 'Create account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function BackupTab() {
  const { toast } = useToast();
  const importBackup = useImportBackup();
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    try {
      const data = await exportBackupRequest();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biashara-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Backup downloaded' });
    } catch {
      toast({ title: 'Could not export backup', variant: 'destructive' });
    }
  }

  async function handleImportFile(file: File) {
    if (!confirm('This will REPLACE all current sales, stock, customers and debts with the contents of this backup. Continue?')) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importBackup.mutateAsync({ data: { confirm: true, data: parsed.data } });
      toast({ title: 'Backup restored — reloading…' });
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      toast({ title: 'Could not restore backup. Check the file and try again.', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><DatabaseBackup className="w-5 h-5 text-primary" /> Backup & Restore</CardTitle>
        <CardDescription>Export your data regularly. Keep a copy off this device (e.g. a USB drive or cloud folder).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        <div className="flex items-center justify-between rounded-xl border border-border p-4">
          <div>
            <p className="font-semibold text-sm">Download a backup</p>
            <p className="text-xs text-muted-foreground mt-0.5">All products, sales, customers, debts and M-PESA records.</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div>
            <p className="font-semibold text-sm">Restore from a backup file</p>
            <p className="text-xs text-muted-foreground mt-0.5">Replaces all current business data. This can't be undone.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
          />
          <Button
            variant="outline"
            className="rounded-xl border-destructive/40 text-destructive"
            disabled={importing}
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-1.5" /> {importing ? 'Restoring…' : 'Restore'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  const { toast } = useToast();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await changePassword.mutateAsync({ data: { currentPassword, newPassword } });
      setDone(true);
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      setError('Current password is incorrect.');
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="w-5 h-5 text-primary" /> Security</CardTitle>
        <CardDescription>Change your own password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label>Current password</Label>
            <Input type="password" className="rounded-xl" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" className="rounded-xl" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 text-sm text-secondary font-medium bg-secondary/10 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Password changed. Reloading…
            </div>
          )}
          <Button type="submit" className="rounded-xl font-bold" disabled={changePassword.isPending}>
            <KeyRound className="w-4 h-4 mr-1.5" /> {changePassword.isPending ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-muted-foreground font-medium mt-1">Manage your shop, staff and data.</p>
      </div>

      <Tabs defaultValue="shop">
        <TabsList className="rounded-xl">
          <TabsTrigger value="shop">Shop Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Staff</TabsTrigger>}
          {isAdmin && <TabsTrigger value="backup">Backup</TabsTrigger>}
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="shop" className="mt-4">
          <ShopProfileTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <UsersTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="backup" className="mt-4">
            <BackupTab />
          </TabsContent>
        )}
        <TabsContent value="security" className="mt-4">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
