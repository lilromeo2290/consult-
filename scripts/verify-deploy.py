import paramiko

HOST, USER, PASS = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'

def ssh_cmd(ssh, cmd):
    si, so, se = ssh.exec_command(cmd, timeout=30)
    out = so.read().decode().strip()
    err = se.read().decode().strip()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

# 1. Test GET businesses (existing data)
print('=== Test GET businesses ===')
out, err = ssh_cmd(ssh, '''curl -s "http://localhost:3001/api/rms-data?key=rms-businesses" | head -c 200''')
print(f'Response: {out}')

# 2. Test PUT rate overrides
print('\n=== Test PUT rate overrides ===')
out, err = ssh_cmd(ssh, '''curl -s -X PUT http://localhost:3001/api/rms-data -H "Content-Type: application/json" -d '{"key":"rms-rate-overrides","data":{"A101":{"amount":500,"ceiling":2000}}}' ''')
print(f'PUT: {out}')

# 3. Test GET rate overrides
print('\n=== Test GET rate overrides ===')
out, err = ssh_cmd(ssh, '''curl -s "http://localhost:3001/api/rms-data?key=rms-rate-overrides"''')
print(f'GET: {out}')

# 4. Verify in DB
print('\n=== DB verify ===')
out, err = ssh_cmd(ssh, '''sqlite3 /home/consult-rms/data/rms.db "SELECT substr(data, 1, 200) FROM RmsData WHERE key='rms-rate-overrides';"''')
print(f'DB: {out}')

# 5. Verify engine binary
print('\n=== Engine binary ===')
out, err = ssh_cmd(ssh, 'ls /home/consult-rms/.next/standalone/node_modules/.prisma/client/libquery_engine-rhel-openssl-1.1.x.so.node 2>/dev/null && echo "CORRECT binary present" || echo "MISSING"')
print(f'Binary: {out}')

ssh.close()
print('\nVerification complete.')
