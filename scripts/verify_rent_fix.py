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
for r in data:
    name = r.get('occupantName', '?')
    uniq = r.get('rentPropertyUniqueNumber', '')
    pnum = r.get('rentPropertyNumber', '')
    print(f'{name:25s} | {uniq:35s} | {pnum}')
client.close()
