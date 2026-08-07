import paramiko, json

HOST, USER, PASS = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'

def ssh_cmd(ssh, cmd):
    si, so, se = ssh.exec_command(cmd, timeout=30)
    out = so.read().decode().strip()
    err = se.read().decode().strip()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

# 1. Check if the rms-rate-overrides key exists in the database
print('=== Checking database for rms-rate-overrides ===')
out, err = ssh_cmd(ssh, '''sqlite3 /home/consult-rms/data/rms.db "SELECT key, length(data), substr(data, 1, 300) FROM RmsData WHERE key='rms-rate-overrides';"''')
print(f'DB row: {out}')
if err: print(f'Err: {err}')

# 2. Check all keys
print('\n=== All keys in database ===')
out, err = ssh_cmd(ssh, '''sqlite3 /home/consult-rms/data/rms.db "SELECT key, length(data) FROM RmsData ORDER BY key;"''')
print(f'Keys: {out}')

# 3. Check the built client JS for rate-overrides string
print('\n=== Checking built client code ===')
out, err = ssh_cmd(ssh, '''grep -rl "rms-rate-overrides" /home/consult-rms/.next/standalone/.next/static/chunks/ 2>/dev/null | head -5''')
print(f'Files mentioning key: {out}')

# 4. Check PM2 error logs
print('\n=== PM2 error logs (last 15 lines) ===')
out, err = ssh_cmd(ssh, 'tail -15 /root/.pm2/logs/consult-rms-error.log 2>/dev/null')
print(f'Errors: {out if out else "(none)"}')

# 5. Test API PUT from server
print('\n=== Testing API PUT from server ===')
out, err = ssh_cmd(ssh, '''curl -s -X PUT http://localhost:3001/api/rms-data -H "Content-Type: application/json" -d '{"key":"rms-rate-overrides","data":{"A101":{"amount":999,"ceiling":5000}}}' ''')
print(f'PUT: {out}')

# 6. Read it back via API
print('\n=== Testing API GET from server ===')
out, err = ssh_cmd(ssh, '''curl -s "http://localhost:3001/api/rms-data?key=rms-rate-overrides"''')
print(f'GET: {out[:500]}')

# 7. Verify in DB
print('\n=== DB after test PUT ===')
out, err = ssh_cmd(ssh, '''sqlite3 /home/consult-rms/data/rms.db "SELECT substr(data, 1, 300) FROM RmsData WHERE key='rms-rate-overrides';"''')
print(f'DB: {out}')

# 8. Now test that GET returns what we just wrote
print('\n=== Verify round-trip ===')
out, err = ssh_cmd(ssh, '''curl -s "http://localhost:3001/api/rms-data?key=rms-rate-overrides" | python3 -c "import sys,json; d=json.load(sys.stdin); print('A101 amount:', d.get('data',{}).get('A101',{}).get('amount'));"''')
print(f'Round-trip check: {out}')

ssh.close()
print('\nDebug complete.')
