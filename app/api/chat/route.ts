import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { message: userMessage } = await request.json();

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are not set.');
      return NextResponse.json({ error: 'Supabase configuration missing. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.' }, { status: 500 });
    }

    // Initialize Supabase client for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Call OpenAI API with function calling
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-0125-preview',
        messages: [
          {
            role: 'system',
            content: `You are a creative social media content generator and post idea assistant. Help users create engaging social media posts with compelling copy, hashtags, and creative ideas. 

IMPORTANT: When you generate ANY post content, captions, or social media copy, you MUST call the create_post function to save it automatically.

You should call create_post when:
- You write post copy with hashtags (like "🐾🐶 Unleash the cuteness... #PuppyLove")
- You create captions for any platform  
- You generate specific social media content
- You write ready-to-use post text
- The user asks for "a post about..." or similar requests

You should NOT call create_post for:
- General advice or tips without specific post content
- Explanations about social media strategy
- Questions back to the user

Always provide your creative response AND call the function when you create actual post content. The user expects post content to be automatically saved to their collection.`,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        max_tokens: 1000,
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
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
    }

    const data = await openaiResponse.json();
    const message = data.choices[0].message;
    let aiResponseContent = message.content || '';
    let createdPosts = [];

    // Handle function calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === 'create_post') {
          try {
            const postArgs = JSON.parse(toolCall.function.arguments);

            // Save post to Supabase
            const { data: postData, error: postError } = await supabase
              .from('posts')
              .insert([
                {
                  title: postArgs.title,
                  content: postArgs.content,
                  platform: postArgs.platform || 'general',
                  post_type: postArgs.post_type || 'idea',
                  tags: postArgs.tags || [],
                  source: 'chat',
                  status: 'idea',
                  user_prompt: userMessage,
                },
              ])
              .select();

            if (postError) {
              console.error('Error saving post to Supabase:', postError);
            } else {
              console.log('Post successfully saved:', postData);
              createdPosts.push(postData[0]);
            }
          } catch (error) {
            console.error('Error processing create_post function call:', error);
          }
        }
      }

      // If posts were created, add a note to the response
      if (createdPosts.length > 0) {
        aiResponseContent += `\n\n✅ ${createdPosts.length} post idea${createdPosts.length > 1 ? 's' : ''} saved to your collection!`;
      }
    }

    // Log the data being sent to Supabase for debugging
    console.log('Attempting to save to Supabase:');
    console.log('Request message:', userMessage);
    console.log('AI Response content:', aiResponseContent);

    // Save chat to Supabase
    const { data: supabaseData, error: supabaseError } = await supabase.from('chats').insert([
      {
        request: userMessage,
        response: aiResponseContent,
      },
    ]);

    if (supabaseError) {
      console.error('Error saving chat to Supabase:', supabaseError);
      // Log specific properties of the error object for more detail
      const err: any = supabaseError; // Cast to any to access all properties
      console.error('Supabase error code:', err.code);
      console.error('Supabase error message:', err.message);
      console.error('Supabase error details:', err.details);
      console.error('Supabase error hint:', err.hint);
      // Log the full error object, including non-enumerable properties
      console.error('Full Supabase error object (JSON):', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      console.error('Supabase data (if any):', supabaseData); // Log data even if error is present

      // If the error object is empty, provide a more generic message
      if (Object.keys(supabaseError).length === 0) {
        console.error('Supabase error object is empty. This often indicates a problem with Supabase configuration (e.g., incorrect URL/key, table schema, or RLS).');
        // Throw a new error to be caught by the outer try-catch, providing a clearer message to the client
        throw new Error('Failed to save chat history to Supabase. Please check your Supabase configuration and table schema.');
      } else {
        // If there's a specific error message, use it
        throw new Error(`Failed to save chat history to Supabase: ${supabaseError.message || 'Unknown error'}`);
      }
    } else {
      console.log('Chat successfully saved to Supabase:', supabaseData);
    }

    return NextResponse.json({
      message: aiResponseContent,
    });
  } catch (error) {
    console.error('Error processing chat request:', error);
    // Ensure the error message is user-friendly
    let errorMessage = 'Failed to generate content';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
