-- Create banned_emails table
CREATE TABLE public.banned_emails (
  email CITEXT PRIMARY KEY,
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for performance
CREATE INDEX idx_banned_emails_banned_at ON public.banned_emails(banned_at);

-- Enable RLS (only admins should manage this table)
ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

-- Note: No public policies - this table is only accessible via service role
-- Edge functions will use service role to check banned emails
