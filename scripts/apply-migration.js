const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://clwfrwgmqwfofraqqmms.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsd2Zyd2dtcXdmb2ZyYXFxbW1zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzMTk5NiwiZXhwIjoyMDc0OTA3OTk2fQ.2b1urif47-t_kCKzCLzYIXM41pQf9WPaT58LZIRPPDE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250217000001_create_commesse_documenti.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration...');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.error('Error executing statement:', error);
      } else {
        console.log('✓ Statement executed successfully');
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  }

  console.log('Migration completed!');
}

applyMigration();
