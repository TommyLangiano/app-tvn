/**
 * Script di migrazione bucket: fatture-documents → app-storage
 *
 * Questo script:
 * 1. Lista tutti i file in fatture-documents
 * 2. Copia ogni file in app-storage mantenendo la stessa struttura
 * 3. Verifica che la copia sia andata a buon fine
 * 4. Stampa report finale
 *
 * NOTA: NON elimina i file originali - fallo manualmente dopo la verifica
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MigrationStats {
  total: number;
  copied: number;
  failed: number;
  skipped: number;
}

const stats: MigrationStats = {
  total: 0,
  copied: 0,
  failed: 0,
  skipped: 0,
};

async function migrateFiles() {
  console.log('🚀 Starting bucket migration: fatture-documents → app-storage\n');

  // List all files in fatture-documents bucket
  const { data: files, error: listError } = await supabase.storage
    .from('fatture-documents')
    .list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (listError) {
    console.error('❌ Error listing files:', listError);
    return;
  }

  if (!files || files.length === 0) {
    console.log('✅ No files to migrate');
    return;
  }

  console.log(`📦 Found ${files.length} top-level items to migrate\n`);

  // Recursively process all files
  await processDirectory('', files);

  // Print final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION REPORT');
  console.log('='.repeat(60));
  console.log(`Total files:   ${stats.total}`);
  console.log(`Copied:        ${stats.copied} ✅`);
  console.log(`Skipped:       ${stats.skipped} ⏭️`);
  console.log(`Failed:        ${stats.failed} ❌`);
  console.log('='.repeat(60));

  if (stats.failed === 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  NEXT STEPS:');
    console.log('1. Verify files in Supabase Dashboard (Storage → app-storage)');
    console.log('2. Update your code to use app-storage (already done ✅)');
    console.log('3. Test the application thoroughly');
    console.log('4. Once confirmed, manually delete fatture-documents bucket');
  } else {
    console.log('\n⚠️  Migration completed with errors. Check failed files above.');
  }
}

async function processDirectory(prefix: string, items: any[]) {
  for (const item of items) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

    // If it's a folder, list its contents recursively
    if (!item.id) {
      const { data: subItems, error: subError } = await supabase.storage
        .from('fatture-documents')
        .list(itemPath, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (subError) {
        console.error(`❌ Error listing ${itemPath}:`, subError.message);
        continue;
      }

      if (subItems && subItems.length > 0) {
        await processDirectory(itemPath, subItems);
      }
    } else {
      // It's a file, migrate it
      await migrateFile(itemPath);
    }
  }
}

async function migrateFile(filePath: string) {
  stats.total++;

  try {
    console.log(`📄 Migrating: ${filePath}`);

    // Check if file already exists in app-storage
    const { data: existingFile } = await supabase.storage
      .from('app-storage')
      .list(path.dirname(filePath) === '.' ? '' : path.dirname(filePath), {
        search: path.basename(filePath),
      });

    if (existingFile && existingFile.length > 0) {
      console.log(`   ⏭️  Already exists, skipping`);
      stats.skipped++;
      return;
    }

    // Download file from fatture-documents
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('fatture-documents')
      .download(filePath);

    if (downloadError) {
      console.error(`   ❌ Download failed:`, downloadError.message);
      stats.failed++;
      return;
    }

    if (!fileData) {
      console.error(`   ❌ No data downloaded`);
      stats.failed++;
      return;
    }

    // Upload to app-storage with same path
    const { error: uploadError } = await supabase.storage
      .from('app-storage')
      .upload(filePath, fileData, {
        contentType: fileData.type,
        upsert: false,
      });

    if (uploadError) {
      console.error(`   ❌ Upload failed:`, uploadError.message);
      stats.failed++;
      return;
    }

    console.log(`   ✅ Copied successfully`);
    stats.copied++;

  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message);
    stats.failed++;
  }
}

// Run migration
migrateFiles().catch(console.error);
