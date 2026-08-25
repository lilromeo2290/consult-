import sqlite3
import json

DB_PATH = '/home/kpma-rms-build-fresh/db/custom.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT data FROM RmsData WHERE key = 'rms-business-register'")
row = cursor.fetchone()
if row:
    data = json.loads(row[0])
    print(f'rms-business-register: {len(data)} entries')
    for i, item in enumerate(data):
        bun = item.get('businessUniqueNumber', '')
        dan = item.get('daAssignmentNo', '')
        print(f'  [{i}] {item.get("name","")} | bun: {bun} | dan: {dan}')

conn.close()
