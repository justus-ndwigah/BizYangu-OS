import { History, Package, ShoppingCart, Users as UsersIcon, Receipt, ShieldAlert } from 'lucide-react';
import { useAuth } from '@workspace/auth-web';
import { useListAuditLogs } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const ENTITY_ICONS: Record<string, typeof Package> = {
  product: Package,
  sale: ShoppingCart,
  user: UsersIcon,
  debt: Receipt,
};

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ActivityLog() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: logs, isLoading } = useListAuditLogs({ query: { enabled: isAdmin } });

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Card className="rounded-2xl border-border/60 shadow-sm text-center p-12">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-extrabold text-foreground">Admins only</h2>
          <p className="text-muted-foreground mt-2">The activity log is only visible to shop admins.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">Activity Log</h1>
        <p className="text-muted-foreground mt-1">Who did what, most recent first</p>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent activity
          </CardTitle>
          <CardDescription>Product, sale, staff, and debt changes across the shop</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && logs?.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No activity recorded yet.</p>
          )}

          <div className="divide-y divide-border/60">
            {logs?.map((log) => {
              const Icon = ENTITY_ICONS[log.entityType] ?? History;
              return (
                <div key={log.id} className="flex items-start gap-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{log.summary}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {log.userName ?? 'Unknown user'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{timeAgo(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
