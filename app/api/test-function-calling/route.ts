import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Test OpenAI function calling
    const testMessage = 'Create a post about cute puppies playing in the park';

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a social media content generator. When you create post content, you MUST call the create_post function.`,
          },
          {
            role: 'user',
            content: testMessage,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_post',
              description: "Save a post idea or content to the user's post collection",
              parameters: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'A short, descriptive title for the post idea',
                  },
                  content: {
                    type: 'string',
                    description: 'The actual post content, caption, or copy',
                  },
                  platform: {
                    type: 'string',
                    enum: ['instagram', 'twitter', 'linkedin', 'tiktok', 'facebook', 'youtube', 'general'],
                    description: 'The target social media platform',
                  },
                  post_type: {
                    type: 'string',
                    enum: ['idea', 'caption', 'story', 'reel', 'post', 'thread', 'video'],
                    description: 'The type of post content',
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Relevant hashtags or tags (without # symbol)',
                  },
                },
                required: ['title', 'content', 'platform', 'post_type'],
              },
            },
          },
        ],
        tool_choice: 'auto',
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      return NextResponse.json({ error: errorData }, { status: 500 });
    }

    const data = await openaiResponse.json();
    const message = data.choices[0].message;

    return NextResponse.json({
      success: true,
      message_content: message.content,
      tool_calls: message.tool_calls || null,
      full_response: data,
    });
  } catch (error) {
    console.error('Test function calling error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
