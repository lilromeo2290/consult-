import sqlite3, json

conn = sqlite3.connect('/home/z/my-project/db/custom.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print('--- RmsData keys ---')
cur.execute('SELECT DISTINCT key FROM RmsData')
for r in cur.fetchall():
    print(r[0])

for t in ['Invoice', 'InvoiceItem', 'Payment']:
    cur.execute(f'PRAGMA table_info({t})')
    cols = [(r['name'], r['type']) for r in cur.fetchall()]
    print()
    print(f'--- {t} columns ---')
    for c in cols:
        print(c)

print()
print('--- Sample rms-bills from RmsData ---')
cur.execute("SELECT value FROM RmsData WHERE key='rms-bills' LIMIT 1")
row = cur.fetchone()
if row:
    data = json.loads(row['value'])
    print(f'Total bills: {len(data)}')
    if data:
        print('First bill keys:', list(data[0].keys()) if isinstance(data[0], dict) else type(data[0]))
        has_code = sum(1 for b in data if isinstance(b, dict) and b.get('revenueCode'))
        print(f'Bills with revenueCode: {has_code}/{len(data)}')
        seen = set()
        for b in data:
            if isinstance(b, dict):
                bt = b.get('billType', '')
                if bt not in seen:
                    seen.add(bt)
                    keys_to_show = [k for k in ['billType','revenueCode','revenueDescription','amountDue','charge','uniqueNumber'] if k in b]
                    sample = {k: b[k] for k in keys_to_show}
                    print(f'  billType={bt}: {sample}')
else:
    print('No rms-bills found')

conn.close()
