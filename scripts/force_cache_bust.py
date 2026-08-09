import paramiko, re, random, string

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

old_id = 'ACnR_R6h6bYeGrr1UjMU0'
new_id = 'Bx9kP2mN7qRs4tWvYz8n'

# Use sed for speed - replace buildId in all files, rename dir
cmds = [
    # Replace buildId in all server files (fast with sed)
    f'find {APP}/standalone/.next/server/ -type f -exec sed -i "s/{old_id}/{new_id}/g" {{}} +',
    # Replace in static files  
    f'find {APP}/standalone/.next/static/ -type f -exec sed -i "s/{old_id}/{new_id}/g" {{}} +',
    # Replace in server.js and other root files
    f'sed -i "s/{old_id}/{new_id}/g" {APP}/server.js',
    f'sed -i "s/{old_id}/{new_id}/g" {APP}/standalone/server.js',
    # Rename the buildId directory
    f'mv {APP}/standalone/.next/static/{old_id} {APP}/standalone/.next/static/{new_id}',
    # Restart
    'pm2 restart consult-rms',
]

for cmd in cmds:
    print(f'  {cmd[:90]}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(f'  -> {out[:200]}')
    if err: print(f'  ERR: {err[:200]}')

# Verify
stdin, stdout, stderr = ssh.exec_command(f'ls {APP}/standalone/.next/static/{new_id}/ 2>&1 | head -5')
print(f'New dir: {stdout.read().decode().strip()}')

stdin, stdout, stderr = ssh.exec_command(f'ls {APP}/standalone/.next/static/{old_id} 2>&1')
print(f'Old dir gone: {stdout.read().decode().strip()}')

ssh.close()
print('Done!')
