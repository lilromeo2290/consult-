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

# First pass: find the max sequence number per type for existing KpMA-formatted entries
type_max_seq = {}
for r in data:
    ptype = r.get('rentPropertyType', '')
    uniq = r.get('rentPropertyUniqueNumber', '')
    prefix = TYPE_PREFIX.get(ptype, '')
    if uniq and prefix and uniq.startswith('KpMA/'):
        parts = uniq.split('/')
        if len(parts) >= 5:
            try:
                seq = int(parts[-1])
                if seq > type_max_seq.get(ptype, 0):
                    type_max_seq[ptype] = seq
            except ValueError:
                pass

fixed_count = 0
for r in data:
    ptype = r.get('rentPropertyType', '')
    uniq = r.get('rentPropertyUniqueNumber', '')
    prefix = TYPE_PREFIX.get(ptype, '')
    
    # Fix if: empty OR does not start with KpMA/
    if not uniq or not uniq.startswith('KpMA/'):
        if prefix:
            type_max_seq[ptype] = type_max_seq.get(ptype, 0) + 1
            new_uniq = f'{prefix}{str(type_max_seq[ptype]).zfill(4)}'
            r['rentPropertyUniqueNumber'] = new_uniq
            fixed_count += 1
            print(f'Fixed: {r.get("occupantName","?"):25s} | {ptype:35s} | {uniq or "(empty)":>20s} -> {new_uniq}')
        else:
            print(f'SKIP:  {r.get("occupantName","?"):25s} | {ptype:35s} | no prefix mapping')
    else:
        print(f'OK:    {r.get("occupantName","?"):25s} | {uniq}')

if fixed_count == 0:
    print('\nNo records needed fixing.')
else:
    # Write JSON to a temp file on VPS, then use Python on VPS to update DB
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
    
    # Upload JSON to VPS
    sftp = client.open_sftp()
    with sftp.open('/tmp/rent_fix.json', 'w') as f:
        f.write(new_json)
    sftp.close()
    
    # Upload script to VPS
    sftp = client.open_sftp()
    with sftp.open('/tmp/apply_rent_fix.py', 'w') as f:
        f.write(remote_script)
    sftp.close()
    
    result = run('python3 /tmp/apply_rent_fix.py')
    print(f'\n{result}')
    print(f'{fixed_count} record(s) fixed in database.')

# Verify
print('\n--- Verification ---')
data_json2 = run(f"""sqlite3 {db_path} "SELECT data FROM RmsData WHERE key='rms-rents';" """)
data2 = json.loads(data_json2)
for r in data2:
    name = r.get('occupantName', '?')
    uniq = r.get('rentPropertyUniqueNumber', '')
    pnum = r.get('rentPropertyNumber', '')
    status = 'OK' if uniq.startswith('KpMA/') else 'WRONG'
    print(f'{status:5s} | {name:25s} | {uniq:35s}')

client.close()
