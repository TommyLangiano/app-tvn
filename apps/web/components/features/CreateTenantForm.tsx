'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type PlanId = 'base' | 'pro' | 'premium';

const plans = [
  { id: 'base' as PlanId, name: 'Base', description: '14-day trial' },
  { id: 'pro' as PlanId, name: 'Pro', description: '14-day trial' },
  { id: 'premium' as PlanId, name: 'Premium', description: '14-day trial' },
];

export function CreateTenantForm() {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<PlanId>('base');
  const [isLoading, setIsLoading] = useState(false);

  const onCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a tenant name');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc('create_tenant', {
        p_name: name,
        p_plan: plan,
      });

      if (error) {
        console.error('Error creating tenant:', error);
        toast.error('Failed to create tenant');
        return;
      }

      toast.success('Workspace created successfully!');

      // Redirect to dashboard (will reload with new tenant)
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[600px] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Your Workspace</CardTitle>
          <CardDescription>
            Get started by creating your first workspace. You&apos;ll get a 14-day free trial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              placeholder="My Company"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-3">
            <Label>Select Plan</Label>
            <RadioGroup value={plan} onValueChange={(value) => setPlan(value as PlanId)}>
              {plans.map((p) => (
                <div key={p.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={p.id} id={p.id} disabled={isLoading} />
                  <Label htmlFor={p.id} className="flex flex-1 cursor-pointer items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-sm text-muted-foreground">{p.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button onClick={onCreate} disabled={isLoading} className="w-full">
            {isLoading ? 'Creating...' : 'Create Workspace'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
