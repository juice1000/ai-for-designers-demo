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
    console.log('Fetching posts from Supabase...');

    const { data: posts, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100); // Limit to last 100 posts

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch posts', details: error.message }, { status: 500 });
    }

    console.log(`Successfully fetched ${posts?.length || 0} posts`);

    return NextResponse.json({
      success: true,
      posts: posts || [],
      count: posts?.length || 0,
    });
  } catch (error) {
    console.error('Posts history API error:', error);
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
    const { title, content, platform = 'general', post_type = 'idea', tags = [], source = 'chat', status = 'draft', scheduled_date, user_prompt, metadata = {} } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Missing required fields: title and content' }, { status: 400 });
    }

    console.log('Storing post in Supabase...');

    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          title,
          content,
          platform,
          post_type,
          tags,
          source,
          status,
          scheduled_date,
          user_prompt,
          metadata,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to store post', details: error.message }, { status: 500 });
    }

    console.log('Post stored successfully:', data.id);

    return NextResponse.json({
      success: true,
      id: data.id,
      post: data,
      message: 'Post stored successfully',
    });
  } catch (error) {
    console.error('Post storage API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
