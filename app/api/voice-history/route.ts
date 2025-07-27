import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    console.log('Fetching voice history from Supabase...');

    const { data: voice, error } = await supabase.from('voice').select('*').order('created_at', { ascending: false }).limit(50); // Limit to last 50 voice interactions

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch voice history', details: error.message }, { status: 500 });
    }

    console.log(`Successfully fetched ${voice?.length || 0} voice interactions`);

    return NextResponse.json({
      success: true,
      voice: voice || [],
      count: voice?.length || 0,
    });
  } catch (error) {
    console.error('Voice history API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_audio_transcript, ai_response, interaction_type = 'multi-step', duration_ms, audio_url } = body;

    if (!user_audio_transcript || !ai_response) {
      return NextResponse.json({ error: 'Missing required fields: user_audio_transcript and ai_response' }, { status: 400 });
    }

    console.log('Storing voice interaction in Supabase...');

    const { data, error } = await supabase
      .from('voice')
      .insert([
        {
          user_audio_transcript,
          ai_response,
          interaction_type,
          duration_ms,
          audio_url,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to store voice interaction', details: error.message }, { status: 500 });
    }

    console.log('Voice interaction stored successfully:', data.id);

    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Voice interaction stored successfully',
    });
  } catch (error) {
    console.error('Voice storage API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
