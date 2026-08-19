#!/usr/bin/env python3
"""Deploy Kumasi→Kpando name fix to VPS."""
import paramiko, os, time, tarfile

VPS_HOST = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'
LOCAL_STANDALONE = '/home/z/my-project/.next/standalone'
LOCAL_STATIC = '/home/z/my-project/.next/static'
LOCAL_PUBLIC = '/home/z/my-project/public'
REMOTE_DIR = '/home/kpma-rms'

def run(ssh, cmd, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()[:500]
    err = stderr.read().decode()[:500]
    if out.strip(): print(f'  {out.strip()}')
    if err.strip(): print(f'  ERR: {err.strip()}')
    return out + err

print('Connecting to VPS...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
print('Connected!')

# Create tar
print('Creating deployment archive...')
tar_path = '/tmp/kpma-deploy.tar.gz'
with tarfile.open(tar_path, 'w:gz') as tar:
    for root, dirs, files in os.walk(LOCAL_STANDALONE):
        for f in files:
            full = os.path.join(root, f)
            arcname = os.path.relpath(full, LOCAL_STANDALONE)
            tar.add(full, arcname=arcname)
    for root, dirs, files in os.walk(LOCAL_STATIC):
        for f in files:
            full = os.path.join(root, f)
            arcname = os.path.join('.next/static', os.path.relpath(full, LOCAL_STATIC))
            tar.add(full, arcname=arcname)
    for item in os.listdir(LOCAL_PUBLIC):
        full = os.path.join(LOCAL_PUBLIC, item)
        if os.path.isfile(full):
            tar.add(full, arcname=os.path.join('public', item))
print(f'Archive: {os.path.getsize(tar_path) / 1024 / 1024:.1f} MB')

# Upload
print('Uploading...')
sftp = ssh.open_sftp()
sftp.put(tar_path, '/tmp/kpma-deploy.tar.gz')
sftp.close()
print('Upload complete.')

# Deploy
print('Deploying...')
run(ssh, f'rm -rf {REMOTE_DIR}/*', timeout=60)
run(ssh, f'cd {REMOTE_DIR} && tar xzf /tmp/kpma-deploy.tar.gz', timeout=120)
run(ssh, f'rm /tmp/kpma-deploy.tar.gz')

# Fix .env
run(ssh, f'echo "DATABASE_URL=file:/home/kpma-rms-build-fresh/db/custom.db" > {REMOTE_DIR}/.env')
run(ssh, f'echo "PORT=3008" >> {REMOTE_DIR}/.env')

# Restart
print('Restarting PM2...')
run(ssh, 'pm2 delete kpma-rms', timeout=15)
time.sleep(2)
run(ssh, f'cd {REMOTE_DIR} && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms', timeout=15)
time.sleep(3)
run(ssh, 'pm2 save')

# Verify
print('Verifying...')
run(ssh, 'pm2 show kpma-rms | grep -E "status|uptime|exec cwd"')
run(ssh, 'curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3008')

ssh.close()
print('Deploy complete!')
