#!/usr/bin/env python3
"""Fast deploy: upload standalone tarball + static files, restart PM2."""
import paramiko, os, time, json

HOST, USER, PASS = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'
BASE = '/home/consult-rms'
SA = f'{BASE}/.next/standalone'

def ssh_cmd(ssh, cmd):
    si, so, se = ssh.exec_command(cmd, timeout=60)
    return so.read().decode().strip()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)
print('Connected.')

# 1. Remove old
print('Removing old build...')
ssh_cmd(ssh, f'rm -rf {SA} && mkdir -p {SA}')

# 2. Upload standalone tarball
print('Uploading standalone...')
sftp = ssh.open_sftp()
remote_tar = f'{BASE}/rms-deploy.tar.gz'
sftp.put('/tmp/rms-deploy.tar.gz', remote_tar)
sftp.close()
print('Extracting...')
ssh_cmd(ssh, f'cd {SA} && tar xzf {remote_tar} && rm -f {remote_tar}')

# 3. Upload static files
print('Uploading statics...')
os.system('tar czf /tmp/rms-static.tar.gz -C /home/z/my-project/.next static')
sftp2 = ssh.open_sftp()
remote_st = f'{BASE}/rms-static.tar.gz'
sftp2.put('/tmp/rms-static.tar.gz', remote_st)
sftp2.close()
ssh_cmd(ssh, f'mkdir -p {SA}/.next && tar xzf {remote_st} -C {SA}/.next && rm -f {remote_st}')

# 4. Upload public
if os.path.exists('/home/z/my-project/public'):
    print('Uploading public...')
    os.system('tar czf /tmp/rms-public.tar.gz -C /home/z/my-project public')
    sftp3 = ssh.open_sftp()
    remote_pub = f'{BASE}/rms-public.tar.gz'
    sftp3.put('/tmp/rms-public.tar.gz', remote_pub)
    sftp3.close()
    ssh_cmd(ssh, f'tar xzf {remote_pub} -C {SA} && rm -f {remote_pub}')

# 5. Copy BUILD_ID + statics to top-level .next
ssh_cmd(ssh, f'mkdir -p {BASE}/.next')
ssh_cmd(ssh, f'cp {SA}/.next/BUILD_ID {BASE}/.next/BUILD_ID 2>/dev/null || true')
ssh_cmd(ssh, f'cp -r {SA}/.next/static {BASE}/.next/static 2>/dev/null || true')

# 6. Write .env
ssh_cmd(ssh, f"echo 'DATABASE_URL=file:/home/consult-rms/data/rms.db' > {SA}/.env")

# 7. Copy server.js
ssh_cmd(ssh, f'cp {SA}/server.js {BASE}/server.js')

# Verify
bid = ssh_cmd(ssh, f'cat {SA}/.next/BUILD_ID')
print(f'BUILD_ID: {bid}')

# 8. Restart
print('Restarting PM2...')
ssh_cmd(ssh, 'pm2 restart consult-rms')
time.sleep(4)

# Check status
status = ssh_cmd(ssh, 'pm2 jlist')
try:
    apps = json.loads(status)
    for a in apps:
        if a['name'] == 'consult-rms':
            print(f"Status: {a['pm2_env']['status']}, Restarts: {a['pm2_env']['restart_time']}")
except: pass

# Check errors
err = ssh_cmd(ssh, 'tail -10 /root/.pm2/logs/consult-rms-error.log 2>/dev/null')
if err: print(f'Errors: {err[:500]}')
else: print('No errors.')

ssh.close()
print('Deploy complete!')
