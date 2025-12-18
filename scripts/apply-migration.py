#!/usr/bin/env python3
import sys
import psycopg2

# Configurazione database
DB_HOST = "aws-0-eu-central-1.pooler.supabase.com"
DB_PORT = "6543"
DB_NAME = "postgres"
DB_USER = "postgres.hsksgvfkuxusoizshypv"
DB_PASSWORD = "Tommy123!!"

if len(sys.argv) < 2:
    print("Usage: python3 apply-migration.py <migration_file.sql>")
    sys.exit(1)

migration_file = sys.argv[1]

# Leggi il file SQL
with open(migration_file, 'r') as f:
    sql = f.read()

# Connetti al database
try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    conn.autocommit = True
    cursor = conn.cursor()

    # Esegui la migration
    print(f"Applying migration: {migration_file}")
    cursor.execute(sql)

    print("✅ Migration applied successfully!")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"❌ Error applying migration: {e}")
    sys.exit(1)
