import sqlite3

DB_PATH = '/home/kpma-rms-build-fresh/db/custom.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get table info
cursor.execute("PRAGMA table_info(RmsData)")
rows = cursor.fetchall()
for r in rows:
    print(r)

conn.close()
