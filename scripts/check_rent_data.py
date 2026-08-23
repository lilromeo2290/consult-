import paramiko, json

host, user, pwd = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if err:
        print(f'STDERR: {err}')
    return out

db_path = '/home/kpma-rms-build-fresh/db/custom.db'

# Read rms-rents data
data_json = run(f"""sqlite3 {db_path} "SELECT data FROM RmsData WHERE key='rms-rents';" """)
if data_json:
    data = json.loads(data_json)
    print(f'Total records: {len(data)}')
    for r in data:
        uniq = r.get('rentPropertyUniqueNumber', '')
        name = r.get('occupantName', '?')
        ptype = r.get('rentPropertyType', '?')
        propnum = r.get('rentPropertyNumber', '')
        print(f'  {name:25s} | unique={uniq!s:35s} | propNum={propnum!s:20s} | {ptype}')

client.close()
