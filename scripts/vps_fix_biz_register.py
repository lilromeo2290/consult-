import sqlite3
import json

DB_PATH = '/home/kpma-rms-build-fresh/db/custom.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT data FROM RmsData WHERE key = 'rms-business-register'")
row = cursor.fetchone()

if row:
    data = json.loads(row[0])
    changed = 0
    for item in data:
        # Fix businessUniqueNumber: /BZ/ -> /BP/
        if 'businessUniqueNumber' in item and '/BZ/' in item['businessUniqueNumber']:
            old = item['businessUniqueNumber']
            item['businessUniqueNumber'] = item['businessUniqueNumber'].replace('/BZ/', '/BP/')
            print(f'Fixed bun: {old} -> {item["businessUniqueNumber"]}')
            changed += 1
        # Fix daAssignmentNo: ends with /BZ -> /BP
        if 'daAssignmentNo' in item and item['daAssignmentNo'].endswith('/BZ'):
            old = item['daAssignmentNo']
            item['daAssignmentNo'] = item['daAssignmentNo'][:-3] + '/BP'
            print(f'Fixed dan: {old} -> {item["daAssignmentNo"]}')
            changed += 1
    if changed > 0:
        new_json = json.dumps(data)
        cursor.execute("UPDATE RmsData SET data = ? WHERE key = 'rms-business-register'", (new_json,))
        conn.commit()
        print(f'Updated {changed} fields.')
    else:
        print('No BZ patterns found.')
else:
    print('No rms-business-register data found.')

conn.close()