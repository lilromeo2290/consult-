import paramiko, json

HOST, USER, PASS = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

# Verify by writing SQL to file
sftp = ssh.open_sftp()
sql = "SELECT data FROM RmsData WHERE key = 'rms-businesses';"
with sftp.open('/tmp/verify.sql', 'w') as f:
    f.write(sql)
sftp.close()

si, so, se = ssh.exec_command('sqlite3 /home/consult-rms/data/rms.db < /tmp/verify.sql', timeout=15)
raw = so.read().decode().strip()

if raw:
    bizs = json.loads(raw)
    print(f'Total: {len(bizs)} businesses')
    for b in bizs:
        print(f"  {b.get('regNumber','?')}: code={b.get('code','')!r} desc={b.get('revenueDescription','')!r} desc2={b.get('revenueDescription2','')!r}")
else:
    print('No data found')

ssh.exec_command('rm -f /tmp/verify.sql', timeout=5)
ssh.close()
