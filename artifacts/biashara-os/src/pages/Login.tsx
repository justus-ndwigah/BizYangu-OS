import { useState, type FormEvent } from 'react';
import { useAuth } from '@workspace/auth-web';
import { ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Login() {
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch {
      setError('Incorrect email or password. Please try again.');
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="z-10 w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-[-4deg] transition-transform duration-500 hover:rotate-0 overflow-hidden">
            <img src="/app-icon.png" className="w-full h-full object-cover" alt="" />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">BizYangu OS</h1>
            <p className="text-lg text-muted-foreground font-medium">Your trusted shop ledger.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full bg-card border border-border rounded-2xl p-8 shadow-xl relative mt-8 text-left"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Secure Access
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourshop.co.ke"
                  className="rounded-xl h-11"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl h-11"
                  data-testid="input-password"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg font-bold rounded-xl group"
                disabled={isLoggingIn}
                data-testid="button-login"
              >
                {isLoggingIn ? 'Signing in…' : 'Open Shop'}
                {!isLoggingIn && <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />}
              </Button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-secondary" />
              <span>Your data stays on this device</span>
            </div>
          </form>
        </div>
      </div>

      <div className="absolute bottom-8 text-center text-xs text-muted-foreground font-medium">
        Built for the Kenyan everyday economy.
      </div>
    </div>
  );
}
