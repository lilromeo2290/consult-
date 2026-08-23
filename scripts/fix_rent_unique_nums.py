import paramiko, json

host, user, pwd = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

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

# Count per type for sequencing
type_seq = {}
for r in data:
    ptype = r.get('rentPropertyType', '')
    uniq = r.get('rentPropertyUniqueNumber', '')
    if not uniq:
        type_seq[ptype] = type_seq.get(ptype, 0) + 1
        prefix = TYPE_PREFIX.get(ptype, '')
        new_uniq = f'{prefix}{str(type_seq[ptype]).zfill(4)}'
        r['rentPropertyUniqueNumber'] = new_uniq
        print(f'Fixed: {r.get("occupantName","?"):25s} | {ptype:35s} | -> {new_uniq}')
    else:
        print(f'OK:    {r.get("occupantName","?"):25s} | {uniq}')

# Write back
new_json = json.dumps(data)
escaped = new_json.replace("'", "''")
run(f"""sqlite3 {db_path} "UPDATE RmsData SET data='{escaped}' WHERE key='rms-rents';" """)
print('\nDatabase updated.')

client.close()
