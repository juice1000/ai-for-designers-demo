import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if images bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      return NextResponse.json(
        {
          error: 'Failed to list buckets',
          details: bucketsError.message,
        },
        { status: 500 }
      );
    }

    const imagesBucket = buckets?.find((bucket) => bucket.id === 'images');

    if (!imagesBucket) {
      return NextResponse.json(
        {
          error: 'Images bucket not found',
          suggestion: 'Run the create-storage-bucket.sql script in Supabase SQL editor',
          availableBuckets: buckets?.map((b) => b.id) || [],
        },
        { status: 404 }
      );
    }

    // Test basic operations
    const { data: files, error: listError } = await supabase.storage.from('images').list('post-images', { limit: 5 });

    return NextResponse.json({
      success: true,
      bucket: imagesBucket,
      canList: !listError,
      listError: listError?.message || null,
      sampleFiles: files?.length || 0,
      message: 'Storage bucket is properly configured',
    });
  } catch (error) {
    console.error('Storage test error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
