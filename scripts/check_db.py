import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=20)

si, so, se = ssh.exec_command("sqlite3 /home/consult-rms/data/rms.db 'SELECT key, length(data) FROM RmsData'")
print('ALL DB entries:', so.read().decode().strip())

si, so, se = ssh.exec_command("sqlite3 /home/consult-rms/data/rms.db \"SELECT data FROM RmsData WHERE key = 'rms-rate-overrides'\"")
raw = so.read().decode().strip()
print('RATE DATA (first 1000 chars):', raw[:1000])
if raw:
    try:
        parsed = json.loads(raw)
        print('Number of entries:', len(parsed))
        # Show first 3
        for i, (k, v) in enumerate(parsed.items()):
            if i >= 3: break
            print(f'  {k}: {v}')
    except:
        print('Failed to parse as JSON')

ssh.close()
