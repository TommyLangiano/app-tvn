-- Create plans table
CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trial_days INT NOT NULL DEFAULT 14
);

-- Seed plans data
INSERT INTO public.plans (id, name, trial_days) VALUES
  ('base', 'Base', 14),
  ('pro', 'Pro', 14),
  ('premium', 'Premium', 14);
