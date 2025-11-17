-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'member',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.users;

-- Create policies
-- All authenticated users can read all user data (we'll handle authorization in the app)
-- This is simpler and avoids the infinite recursion issue
CREATE POLICY "Authenticated users can read users" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can only update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to insert (for profile creation)
CREATE POLICY "Authenticated users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS on_users_updated ON public.users;
CREATE TRIGGER on_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Backfill existing auth users into users table
INSERT INTO public.users (id, email, first_name, last_name, role, avatar_url)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'first_name', ''),
  COALESCE(raw_user_meta_data->>'last_name', ''),
  COALESCE(raw_user_meta_data->>'role', 'member'),
  COALESCE(raw_user_meta_data->>'avatar_url', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
  last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
  role = COALESCE(NULLIF(EXCLUDED.role, ''), public.users.role, 'member'),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);
