import paramiko, time

HOST, USER, PASS = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'
BASE = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

# Check static dir structure
for cmd in [
    f'ls -la {BASE}/.next/static/',
    f'find {BASE}/.next/static/ -name "*.js" | wc -l',
    f'ls {BASE}/.next/static/chunks/ 2>/dev/null | head -10',
    f'find {BASE}/.next/ -name "_buildManifest.js"',
]:
    si, so, se = ssh.exec_command(cmd, timeout=10)
    out = so.read().decode().strip()
    err = se.read().decode().strip()
    print(f'> {cmd[:80]}')
    if out: print(f'  {out[:300]}')
    if err: print(f'  ERR: {err[:200]}')
    print()

ssh.close()
