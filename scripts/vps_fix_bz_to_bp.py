import sqlite3
import json

DB_PATH = '/home/kpma-rms-build-fresh/db/custom.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT key, data FROM RmsData WHERE key = 'rms-businesses'")
row = cursor.fetchone()

if row:
    data = json.loads(row[1])
    changed = 0
    for item in data:
        if 'businessUniqueNumber' in item and '/BZ/' in item['businessUniqueNumber']:
            old = item['businessUniqueNumber']
            item['businessUniqueNumber'] = item['businessUniqueNumber'].replace('/BZ/', '/BP/')
            print(f'Fixed businessUniqueNumber: {old} -> {item["businessUniqueNumber"]}')
            changed += 1
        if 'daAssignmentNo' in item and item['daAssignmentNo'].endswith('/BZ'):
            old = item['daAssignmentNo']
            item['daAssignmentNo'] = item['daAssignmentNo'][:-3] + '/BP'
            print(f'Fixed daAssignmentNo: {old} -> {item["daAssignmentNo"]}')
            changed += 1
    if changed > 0:
        new_json = json.dumps(data)
        cursor.execute("UPDATE RmsData SET data = ? WHERE key = 'rms-businesses'", (new_json,))
        conn.commit()
        print(f'Updated {changed} fields in database.')
    else:
        print('No /BZ/ patterns found to fix.')
else:
    print('No rms-businesses data found.')

conn.close()
