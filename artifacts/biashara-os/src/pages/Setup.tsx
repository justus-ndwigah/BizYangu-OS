import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { useCompleteSetup, getGetCurrentAuthUserQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

// First-run wizard: creates the shop profile and the first admin account.
// Shown automatically when the backend reports no users exist yet.
export function Setup() {
  const qc = useQueryClient();
  const setup = useCompleteSetup();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);

  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function goToStepTwo(e: FormEvent) {
    e.preventDefault();
    if (!shopName.trim()) {
      setError('Please enter your shop name');
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await setup.mutateAsync({
        data: { shopName, phone: phone || undefined, address: address || undefined, firstName, lastName, email, password },
      });
      await qc.invalidateQueries({ queryKey: getGetCurrentAuthUserQueryKey() });
    } catch {
      setError('Could not complete setup. Please check your details and try again.');
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center space-y-4 mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
            <img src="/app-icon.png" className="w-full h-full object-cover" alt="" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Welcome to BizYangu OS</h1>
            <p className="text-muted-foreground font-medium mt-1">
              Let's set up your shop. {step === 1 ? 'Step 1 of 2: Shop details' : 'Step 2 of 2: Your admin account'}
            </p>
          </div>
        </div>

        <Card className="rounded-2xl p-6 shadow-xl">
          {step === 1 ? (
            <form onSubmit={goToStepTwo} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="shopName">Shop name *</Label>
                <Input id="shopName" required value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Mama Njeri General Store" className="rounded-xl h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className="rounded-xl h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address / location</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Kawangware, Nairobi" className="rounded-xl h-11" />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <Button type="submit" size="lg" className="w-full h-12 rounded-xl font-bold">
                Continue <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name *</Label>
                  <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-xl h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-xl h-11" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourshop.co.ke" className="rounded-xl h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="rounded-xl h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password *</Label>
                <Input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl h-11" />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="rounded-xl h-12" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" size="lg" className="flex-1 h-12 rounded-xl font-bold" disabled={setup.isPending}>
                  {setup.isPending ? 'Setting up…' : 'Create shop'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
