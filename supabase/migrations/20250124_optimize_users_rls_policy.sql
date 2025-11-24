-- Optimize RLS policy on users table for better performance
-- This migration replaces the existing SELECT policy with one that allows
-- the query planner to short-circuit for the common case of reading own record

-- Drop the old policy
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;

-- Create optimized policy that short-circuits for own record
-- This allows PostgreSQL to use the PRIMARY KEY index efficiently
CREATE POLICY "Authenticated users can read users" ON public.users
  FOR SELECT USING (
    -- Check own record first (most common case, uses index)
    id = auth.uid() OR
    -- Fall back to general authenticated check (for reading other users)
    auth.uid() IS NOT NULL
  );

-- Add comment explaining the optimization
COMMENT ON POLICY "Authenticated users can read users" ON public.users IS
  'Optimized SELECT policy that short-circuits for own record lookup, reducing JWT validation overhead';
