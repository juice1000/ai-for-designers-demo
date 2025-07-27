-- Create the 'posts' table for storing post ideas from chat and voice agents
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL, -- e.g., 'instagram', 'twitter', 'linkedin', 'tiktok', 'general'
    post_type VARCHAR(50) DEFAULT 'idea' NOT NULL, -- e.g., 'idea', 'caption', 'story', 'reel'
    tags TEXT[], -- Array of hashtags/tags
    source VARCHAR(50) DEFAULT 'chat' NOT NULL, -- 'chat', 'voice', 'manual'
    status VARCHAR(20) DEFAULT 'draft' NOT NULL, -- 'draft', 'scheduled', 'published'
    scheduled_date TIMESTAMP WITH TIME ZONE,
    user_prompt TEXT, -- Original user request that generated this post
    metadata JSONB -- Additional data like image suggestions, links, etc.
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_platform ON public.posts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_source ON public.posts(source);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN (tags);

-- Optional: Add a policy to allow inserts if RLS is enabled
-- For production, you should implement proper authentication policies
-- CREATE POLICY "Allow public insert" ON public.posts FOR INSERT WITH CHECK (true);
-- ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
