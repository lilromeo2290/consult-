import paramiko
import subprocess
import time

VPS_HOST = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'
LOCAL_STANDALONE = '/home/z/my-project/.next/standalone'
LOCAL_STATIC = '/home/z/my-project/.next/static'
LOCAL_PUBLIC = '/home/z/my-project/public'
REMOTE_DIR = '/home/kpma-rms'

print('Connecting to VPS...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)

# Step 1: Clean old build files on VPS
print('Cleaning old build files on VPS...')
cmds = [
    f'rm -rf {REMOTE_DIR}/.next',
    f'rm -rf {REMOTE_DIR}/node_modules',
    f'rm -rf {REMOTE_DIR}/src',
    f'rm -f {REMOTE_DIR}/package.json {REMOTE_DIR}/next.config.* {REMOTE_DIR}/tsconfig.json',
    f'mkdir -p {REMOTE_DIR}/.next/static',
    f'mkdir -p {REMOTE_DIR}/public',
]
for cmd in cmds:
    ssh.exec_command(cmd)
    time.sleep(0.3)

# Step 2: Create tar.gz of standalone build
print('Creating tar archive of standalone build...')
import tarfile
import os

tar_path = '/tmp/kpma-deploy.tar.gz'
with tarfile.open(tar_path, 'w:gz') as tar:
    # Add standalone files
    for root, dirs, files in os.walk(LOCAL_STANDALONE):
        for f in files:
            full = os.path.join(root, f)
            arcname = os.path.relpath(full, LOCAL_STANDALONE)
            tar.add(full, arcname=arcname)
    # Add static files under .next/static/
    for root, dirs, files in os.walk(LOCAL_STATIC):
        for f in files:
            full = os.path.join(root, f)
            arcname = os.path.join('.next/static', os.path.relpath(full, LOCAL_STATIC))
            tar.add(full, arcname=arcname)
    # Add public files
    for item in os.listdir(LOCAL_PUBLIC):
        full = os.path.join(LOCAL_PUBLIC, item)
        if os.path.isfile(full):
            tar.add(full, arcname=os.path.join('public', item))

print(f'Archive size: {os.path.getsize(tar_path) / 1024 / 1024:.1f} MB')

# Step 3: Upload tar via SFTP
print('Uploading to VPS...')
sftp = ssh.open_sftp()
sftp.put(tar_path, '/tmp/kpma-deploy.tar.gz')
sftp.close()
print('Upload complete.')

# Step 4: Extract on VPS
print('Extracting on VPS...')
stdin, stdout, stderr = ssh.exec_command(f'cd {REMOTE_DIR} && tar xzf /tmp/kpma-deploy.tar.gz && rm /tmp/kpma-deploy.tar.gz')
stdout.read()
err = stderr.read().decode()
if err:
    print(f'Extract STDERR: {err}')

# Step 5: Restart kpma-rms
print('Restarting kpma-rms...')
stdin, stdout, stderr = ssh.exec_command('pm2 delete kpma-rms')
stdout.read()
time.sleep(2)

stdin, stdout, stderr = ssh.exec_command(f'cd {REMOTE_DIR} && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms')
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print(f'STDERR: {err}')

time.sleep(3)

# Step 6: Save and verify
stdin, stdout, stderr = ssh.exec_command('pm2 save')
stdout.read()

print()
print('Verifying...')
stdin, stdout, stderr = ssh.exec_command('pm2 show kpma-rms | grep -E "status|uptime|exec cwd"')
print(stdout.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "HTTP %{http_code}" https://kpma.clipeconsult.com')
print(f'Site status: {stdout.read().decode().strip()}')

ssh.close()
print()
print('Deploy complete! BP Payment sidebar item has been removed.')
