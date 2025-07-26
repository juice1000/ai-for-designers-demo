-- Create the 'chats' table if it does not exist
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    request TEXT NOT NULL,
    response TEXT NOT NULL
);

-- Optional: Add a policy to allow inserts if RLS is enabled and you are NOT using the service role key
-- However, with SUPABASE_SERVICE_ROLE_KEY, RLS should be bypassed for this operation.
-- If you are still facing issues, ensure RLS is disabled for this table or policies are correctly set.
-- For example, to allow anonymous inserts (not recommended for production without proper auth):
-- CREATE POLICY "Allow public insert" ON public.chats FOR INSERT WITH CHECK (true);
-- ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
