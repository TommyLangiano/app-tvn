/**
 * Crea il bucket app-storage direttamente via API
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createBucket() {
  console.log('🚀 Creating app-storage bucket...\n');

  // Create bucket
  const { data, error } = await supabase.storage.createBucket('app-storage', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/svg+xml'
    ]
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket app-storage already exists');
    } else {
      console.error('❌ Error creating bucket:', error);
      process.exit(1);
    }
  } else {
    console.log('✅ Bucket app-storage created successfully');
  }

  console.log('\n✅ Done! You can now run the migration script.');
}

createBucket().catch(console.error);
