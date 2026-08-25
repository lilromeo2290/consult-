import paramiko, json

host, user, pwd = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if err:
        print(f'STDERR: {err}')
    return out

db_path = '/home/kpma-rms-build-fresh/db/custom.db'

data_json = run(f"""sqlite3 {db_path} "SELECT data FROM RmsData WHERE key='rms-rents';" """)
data = json.loads(data_json)

# Property type -> unique number prefix
TYPE_PREFIX = {
    'Bill Boards': 'KpMA/KZC/DBB/KPD/',
    'Assembly Hall': 'KpMA/KZC/ASH/KPD/',
    'Assembly Conference Room': 'KpMA/KZC/ACR/KPD/',
    'Community Centres': 'KpMA/KZC/CCH/KPD/',
    'Sub-district/Metro Halls': 'KpMA/KZC/SDH/KPD/',
    'Assembly Forecourt': 'KpMA/KZC/AFC/KPD/',
    'Others': 'KpMA/KZC/OTH/KPD/',
    'Stores': 'KpMA/KZC/LKS/MKS/',
    'Stalls': 'KpMA/KZC/MKT/STL/',
    'Sheds': 'KpMA/KZC/MKT/SHD/',
    'Rent of Open Market Space': 'KpMA/KZC/MKT/OPS/',
    'Rent of Market Warehouse': 'KpMA/KZC/MKT/MWH/',
    'Rent of Undeveloped Lands': 'KpMA/KZC/RUL/KPD/',
    'Hiring of Parks': 'KpMA/KZC/HPK/KPD/',
    'Rent on Leased Buildings': 'KpMA/KZC/RLB/KPD/',
    'Rent for Vendor Stands': 'KpMA/KZC/RVS/KPD/',
    'Official Residence': 'KpMA/KZC/BGL/KPD/',
    'Guest House': 'KpMA/KZC/GHR/KPD/',
    'Restaurant/Canteen': 'KpMA/KZC/RCR/KPD/',
    'Club House': 'KpMA/KZC/CHR/KPD/',
    'Stadium': 'KpMA/KZC/SSR/KPD/',
}

# Renumber ALL records with globally unique sequence numbers
seq = 1
for r in data:
    ptype = r.get('rentPropertyType', '')
    prefix = TYPE_PREFIX.get(ptype, '')
    if prefix:
        new_uniq = f'{prefix}{str(seq).zfill(4)}'
        old_uniq = r.get('rentPropertyUniqueNumber', '')
        r['rentPropertyUniqueNumber'] = new_uniq
        print(f'{r.get("occupantName","?"):25s} | {old_uniq or "(empty)":>30s} -> {new_uniq}')
        seq += 1
    else:
        print(f'SKIP:  {r.get("occupantName","?"):25s} | {ptype} | no prefix mapping')

new_json = json.dumps(data)
remote_script = '''import sqlite3
with open('/tmp/rent_fix.json', 'r') as f:
    data = f.read()
conn = sqlite3.connect('/home/kpma-rms-build-fresh/db/custom.db')
cur = conn.cursor()
cur.execute("UPDATE RmsData SET data=? WHERE key='rms-rents';", (data,))
conn.commit()
print('Rows updated:', cur.rowcount)
conn.close()
'''

sftp = client.open_sftp()
with sftp.open('/tmp/rent_fix.json', 'w') as f:
    f.write(new_json)
sftp.close()

sftp = client.open_sftp()
with sftp.open('/tmp/apply_rent_fix.py', 'w') as f:
    f.write(remote_script)
sftp.close()

result = run('python3 /tmp/apply_rent_fix.py')

print()
print(result)

# Verify
print()
print('--- Verification ---')
data_json2 = run(f"""sqlite3 {db_path} "SELECT data FROM RmsData WHERE key='rms-rents';" """)
data2 = json.loads(data_json2)
for r in data2:
    name = r.get('occupantName', '?')
    uniq = r.get('rentPropertyUniqueNumber', '')
    print(f'{name:25s} | {uniq}')

client.close()
