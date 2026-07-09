-- Admin portal support tables and columns for Supabase

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verification_approved', 'verification_rejected', 'account_suspended', 'account_activated', 'admin_info')),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  admin_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('approve', 'reject', 'edit', 'delete', 'suspend', 'activate', 'role_update')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'verification', 'property', 'inquiry')),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON public.audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can create audit logs" ON public.audit_logs;
CREATE POLICY "Admins can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO anon, authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO anon, authenticated;