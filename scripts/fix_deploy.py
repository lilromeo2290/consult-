import paramiko, time

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'

def run(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    out = stdout.read().decode()[:500]
    err = stderr.read().decode()[:500]
    print(f'>> {cmd[:120]}')
    if out.strip(): print(f'OUT: {out}')
    if err.strip(): print(f'ERR: {err}')
    return out + err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

# Delete and recreate PM2 process to pick up new .env
print('=== Delete & recreate PM2 ===')
run(ssh, 'pm2 delete consult-rms 2>&1')
time.sleep(1)
run(ssh, 'cd /home/consult-rms/standalone && PORT=3001 pm2 start server.js --name consult-rms 2>&1')
time.sleep(3)

# Verify .env
print('=== Verify .env ===')
run(ssh, 'cat /home/consult-rms/standalone/.env')

# Test API with a temp python file
print('=== Test API ===')
run(ssh, '''cat > /tmp/t.py << 'EOF'
import urllib.request, json
req = urllib.request.Request(
    "http://localhost:3001/api/rms-data",
    data=json.dumps({"action":"get","key":"rates"}).encode(),
    headers={"Content-Type":"application/json"},
    method="POST"
)
try:
    resp = urllib.request.urlopen(req, timeout=10)
    print("Status:", resp.status)
    print(resp.read().decode()[:300])
except Exception as e:
    print("Error:", e)
EOF
python3 /tmp/t.py''')
time.sleep(1)

print('=== Error logs ===')
run(ssh, 'pm2 logs consult-rms --err --lines 10 --nostream 2>&1')

print('=== Save PM2 ===')
run(ssh, 'pm2 save 2>&1')

ssh.close()
print('DONE')
