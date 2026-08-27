import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@workspace/auth-web';
import { 
  Store, 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Wallet, 
  MessageSquare,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/record-sale', label: 'Record Sale', icon: ShoppingCart },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/mpesa', label: 'M-PESA', icon: Wallet },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/ai-chat', label: 'AI Advisor', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex min-h-[100dvh] w-full bg-background flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-2 text-primary font-bold text-lg">
          <Store className="w-6 h-6" />
          <span>BizYangu OS</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-20 h-[100dvh] w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 hidden md:flex items-center gap-3 text-sidebar-primary font-bold text-2xl tracking-tight">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span>BizYangu OS</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-4 md:py-0 space-y-1">
          <div className="md:hidden mb-6 flex items-center gap-3 px-2">
            <Avatar className="w-10 h-10 border-2 border-primary/10">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {getInitials(user?.firstName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground leading-none">{user?.firstName || 'Shop Owner'}</span>
              <span className="text-xs text-muted-foreground mt-1">Ready for business</span>
            </div>
          </div>
          
          <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2 hidden md:block">
            Menu
          </div>
          
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors relative group",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground")} />
                {item.label}
                {isActive && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-sidebar-border mt-auto">
          <div className="hidden md:flex items-center gap-3 mb-4 px-2">
            <Avatar className="w-10 h-10 border-2 border-sidebar-primary/20">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-sidebar-primary/10 text-sidebar-primary font-bold">
                {getInitials(user?.firstName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-sidebar-foreground truncate">{user?.firstName || 'Shop Owner'}</span>
              <span className="text-xs text-sidebar-foreground/60">Biashara Admin</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 h-11 rounded-xl"
            onClick={() => logout()}
          >
            <LogOut className="mr-2 w-4 h-4" />
            Close Shop
          </Button>
          <p className="mt-3 text-center text-[11px] text-sidebar-foreground/40">
            Built by Jaz Tech
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-hidden relative pb-16 md:pb-0">
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </main>
      
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-10 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
