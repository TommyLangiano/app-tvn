# Stripe Webhook Edge Function

## Setup

1. **Deploy the function:**
```bash
supabase functions deploy stripe-webhook
```

2. **Set environment secrets:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

3. **Configure Stripe webhook:**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-project-ref.supabase.co/functions/v1/stripe-webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy the webhook signing secret and set it as `STRIPE_WEBHOOK_SECRET`

## Handled Events

### `checkout.session.completed`
- Creates/updates subscription in database
- Uses metadata: `tenant_id`, `plan_id`
- Sets status to `trialing` or `active` based on Stripe subscription
- Sets trial_end and current_period_end

### `customer.subscription.updated`
- Updates subscription status
- Updates current_period_end
- Handles trial → active transition

### `customer.subscription.deleted`
- Marks subscription as `canceled`

## Metadata Requirements

When creating a Stripe Checkout Session, include:
```typescript
metadata: {
  tenant_id: 'uuid-here',
  plan_id: 'base|pro|premium'
}
```
