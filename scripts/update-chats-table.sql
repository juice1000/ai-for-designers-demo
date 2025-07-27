-- Add new columns to the chats table if they don't exist
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'text_input',
ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(255);

-- Create index on source column for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_source ON chats(source);

-- Create index on conversation_id column for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_conversation_id ON chats(conversation_id);

-- Create index on created_at column for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);

-- Update existing records to have a default source if NULL
UPDATE chats SET source = 'text_input' WHERE source IS NULL;
