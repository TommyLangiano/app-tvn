import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get document_path from query params
    const { searchParams } = new URL(request.url);
    const documentPath = searchParams.get('path');

    if (!documentPath) {
      return NextResponse.json({ error: 'Missing document path' }, { status: 400 });
    }

    // Get signed URL for download
    const { data, error } = await supabase.storage
      .from('fatture-documents')
      .createSignedUrl(documentPath, 60); // Valid for 60 seconds

    if (error) {
      return NextResponse.json({ error: 'Failed to get download URL' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
