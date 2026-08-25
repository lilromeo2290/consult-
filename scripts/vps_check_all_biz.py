import sqlite3
import json

DB_PATH = '/home/kpma-rms-build-fresh/db/custom.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# List all keys
cursor.execute("SELECT key, length(data) FROM RmsData ORDER BY key")
rows = cursor.fetchall()
print('All RmsData keys:')
for r in rows:
    print(f'  {r[0]} ({r[1]} bytes)')

# Check businesses specifically
cursor.execute("SELECT data FROM RmsData WHERE key = 'rms-businesses'")
row = cursor.fetchone()
if row:
    data = json.loads(row[0])
    print(f'\nrms-businesses: {len(data)} entries')
    for i, item in enumerate(data):
        bun = item.get('businessUniqueNumber', '')
        dan = item.get('daAssignmentNo', '')
        print(f'  [{i}] {item.get("name","")} | bun: {bun} | dan: {dan}')

conn.close()
