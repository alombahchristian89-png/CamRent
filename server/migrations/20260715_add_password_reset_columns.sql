-- Add password reset support columns to users table
-- Safe to run multiple times.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_reset_password_token
  ON public.users(reset_password_token);
