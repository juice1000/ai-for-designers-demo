import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Store voice interaction in database
async function storeVoiceInteraction(userTranscript: string, aiResponse: string, durationMs?: number) {
  if (!supabase) {
    console.warn('Supabase not configured, skipping voice interaction storage');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('voice')
      .insert([
        {
          user_audio_transcript: userTranscript,
          ai_response: aiResponse,
          interaction_type: 'multi-step',
          duration_ms: durationMs,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to store voice interaction:', error);
      return null;
    }

    console.log('Voice interaction stored successfully:', data.id);
    return data;
  } catch (error) {
    console.error('Error storing voice interaction:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    // First, convert speech to text using OpenAI Whisper
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile, 'audio.webm');
    whisperFormData.append('model', 'whisper-1');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      return NextResponse.json({ error: `Speech recognition failed: ${whisperResponse.status}` }, { status: 500 });
    }

    const transcription = await whisperResponse.json();
    const userText = transcription.text;

    if (!userText || userText.trim().length === 0) {
      return NextResponse.json({ error: 'No speech detected. Please try speaking more clearly.' }, { status: 400 });
    }

    console.log('Transcribed text:', userText);

    // Generate AI response using OpenAI with function calling
    const systemPrompt = `You are a creative content strategist and brainstorming assistant specializing in social media and brand content creation. Your role is to help users generate engaging, authentic, and effective content ideas.

Key capabilities:
- Brainstorm creative content ideas for various social media platforms (Instagram, TikTok, LinkedIn, Twitter, etc.)
- Suggest trending topics and hashtag strategies
- Help develop brand voice and messaging
- Provide content calendar suggestions
- Offer creative angles for product launches, events, or campaigns
- Suggest visual content ideas (photos, videos, graphics)
- Help with storytelling techniques and narrative structures

When you generate specific post content, captions, or actionable post ideas during voice conversations, call the create_post function to save them to the user's post collection.

Guidelines for when to call create_post:
- When you create specific post copy/captions
- When you generate content for a specific platform
- When you provide complete, ready-to-use post ideas
- When the user asks you to create or save content

Keep voice responses concise (30-60 seconds when spoken) but use the function when you create specific post content.

Always aim to spark creativity and provide practical, implementable ideas that align with current social media trends and best practices.`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userText,
          },
        ],
        max_tokens: 400,
        temperature: 0.8,
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

    if (!chatResponse.ok) {
      const errorData = await chatResponse.json();
      console.error('OpenAI Chat API error:', errorData);
      return NextResponse.json({ error: `AI response generation failed: ${chatResponse.status}` }, { status: 500 });
    }

    const chatData = await chatResponse.json();
    const message = chatData.choices[0].message;
    let aiResponseText = message.content || '';
    let createdPosts = [];

    // Handle function calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === 'create_post') {
          try {
            const postArgs = JSON.parse(toolCall.function.arguments);

            // Save post to Supabase
            if (supabase) {
              const { data: postData, error: postError } = await supabase
                .from('posts')
                .insert([
                  {
                    title: postArgs.title,
                    content: postArgs.content,
                    platform: postArgs.platform || 'general',
                    post_type: postArgs.post_type || 'idea',
                    tags: postArgs.tags || [],
                    source: 'voice',
                    status: 'idea',
                    user_prompt: userText,
                  },
                ])
                .select();

              if (postError) {
                console.error('Error saving post to Supabase:', postError);
              } else {
                console.log('Post successfully saved from voice:', postData);
                createdPosts.push(postData[0]);
              }
            }
          } catch (error) {
            console.error('Error processing create_post function call:', error);
          }
        }
      }

      // If posts were created, add a note to the response
      if (createdPosts.length > 0) {
        aiResponseText += ` I've also saved ${createdPosts.length} post idea${createdPosts.length > 1 ? 's' : ''} to your collection for you to review later.`;
      }
    }

    console.log('AI response text:', aiResponseText);

    // Convert AI response to speech using ElevenLabs
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice - good for conversational content

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: aiResponseText,
        model_id: 'eleven_monolingual_v1', // This model works well for TTS
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('ElevenLabs TTS API error:', errorText);
      return NextResponse.json({ error: `Text-to-speech failed: ${ttsResponse.status} - ${errorText}` }, { status: 500 });
    }

    // Get the audio response
    const audioBuffer = await ttsResponse.arrayBuffer();

    // Store the voice interaction in the database
    await storeVoiceInteraction(userText, aiResponseText);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Voice chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Voice processing failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
