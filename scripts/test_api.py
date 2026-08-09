import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=15)

def run(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    out = stdout.read().decode()[:500]
    err = stderr.read().decode()[:500]
    print(f'>> {cmd[:120]}')
    if out.strip(): print(f'OUT: {out}')
    if err.strip(): print(f'ERR: {err}')
    return out + err

print('=== Test GET rates ===')
run(ssh, 'curl -s -m 10 "http://localhost:3001/api/rms-data?key=rates" 2>&1')

time.sleep(1)
print('=== Test GET businesses ===')
run(ssh, 'curl -s -m 10 "http://localhost:3001/api/rms-data?key=businesses" 2>&1 | head -100')

time.sleep(1)
print('=== Error logs ===')
run(ssh, 'pm2 logs consult-rms --err --lines 5 --nostream 2>&1')

ssh.close()
