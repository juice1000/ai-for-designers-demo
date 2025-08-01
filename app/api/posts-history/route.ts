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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, platform, post_type, tags, source, status, scheduled_date, user_prompt, metadata } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    console.log('Updating post in Supabase...', id);

    // Build update object with only provided fields
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (platform !== undefined) updateData.platform = platform;
    if (post_type !== undefined) updateData.post_type = post_type;
    if (tags !== undefined) updateData.tags = tags;
    if (source !== undefined) updateData.source = source;
    if (status !== undefined) updateData.status = status;
    if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
    if (user_prompt !== undefined) updateData.user_prompt = user_prompt;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data, error } = await supabase.from('posts').update(updateData).eq('id', id).select().single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: 'Failed to update post', details: error.message }, { status: 500 });
    }

    console.log('Post updated successfully:', data.id);

    return NextResponse.json({
      success: true,
      id: data.id,
      post: data,
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Post update API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
