-- Create the 'voice' table for storing voice interaction history
CREATE TABLE IF NOT EXISTS public.voice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_audio_transcript TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    interaction_type VARCHAR(50) DEFAULT 'multi-step' NOT NULL,
    duration_ms INTEGER,
    audio_url TEXT
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_voice_created_at ON public.voice(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_interaction_type ON public.voice(interaction_type);

-- Optional: Add a policy to allow inserts if RLS is enabled
-- For production, you should implement proper authentication policies
-- CREATE POLICY "Allow public insert" ON public.voice FOR INSERT WITH CHECK (true);
-- ALTER TABLE public.voice ENABLE ROW LEVEL SECURITY;
