import sqlite3
import json

DB_PATH = '/home/kpma-rms-build-fresh/db/custom.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT key, data FROM RmsData WHERE key = 'rms-businesses'")
row = cursor.fetchone()

if row:
    data = json.loads(row[1])
    print(f'Total entries: {len(data)}')
    for i, item in enumerate(data):
        bun = item.get('businessUniqueNumber', '')
        dan = item.get('daAssignmentNo', '')
        print(f'  [{i}] bun: {bun} | dan: {dan}')
else:
    print('No rms-businesses data found.')

conn.close()
