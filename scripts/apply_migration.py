#!/usr/bin/env python3
import sys
import os
from supabase import create_client, Client

def apply_migration(migration_file):
    # Supabase credentials
    url = "https://hsksgvfkuxusoizshypv.supabase.co"
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhza3NndmZrdXh1c29penNoeXB2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE3MDE0MSwiZXhwIjoyMDUxNzQ2MTQxfQ.y8uH3VTwPO5jXLhv_mM0FjvN49i0SB1f3n-r5SmIc40")

    supabase: Client = create_client(url, key)

    # Read migration file
    with open(migration_file, 'r') as f:
        sql = f.read()

    try:
        # Execute migration
        result = supabase.rpc('exec_sql', {'sql': sql}).execute()
        print(f"✓ Migration applied successfully: {migration_file}")
        return 0
    except Exception as e:
        # Try direct SQL execution via postgrest
        print(f"RPC failed, trying direct SQL execution...")
        try:
            result = supabase.postgrest.rpc('exec_sql', {'sql': sql}).execute()
            print(f"✓ Migration applied successfully: {migration_file}")
            return 0
        except Exception as e2:
            print(f"✗ Error applying migration: {e2}")
            return 1

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 apply_migration.py <migration_file>")
        sys.exit(1)

    migration_file = sys.argv[1]
    if not os.path.exists(migration_file):
        print(f"Error: Migration file not found: {migration_file}")
        sys.exit(1)

    sys.exit(apply_migration(migration_file))
