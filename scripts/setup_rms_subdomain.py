import paramiko, os, time, tarfile

VPS_HOST = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'
LOCAL_STANDALONE = '/home/z/my-project/.next/standalone'
LOCAL_STATIC = '/home/z/my-project/.next/static'
LOCAL_PUBLIC = '/home/z/my-project/public'
REMOTE_DIR = '/home/rms-clipeconsult'
DB_DIR = '/home/rms-clipeconsult-build-fresh/db'
PORT = 3005

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

# Kill old process and PM2 entry
print('Cleaning up old process on port 3005...')
run(ssh, 'pm2 delete rms-clipeconsult 2>/dev/null', timeout=15)
run(ssh, 'fuser -k 3005/tcp 2>/dev/null')
time.sleep(2)

# Create tar from standalone build
print('Creating deployment archive...')
tar_path = '/tmp/rms-clipeconsult-deploy.tar.gz'
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
sftp.put(tar_path, '/tmp/rms-clipeconsult-deploy.tar.gz')
sftp.close()
print('Upload complete.')

# Deploy
print('Deploying...')
run(ssh, f'rm -rf {REMOTE_DIR}/*', timeout=60)
run(ssh, f'mkdir -p {REMOTE_DIR}', timeout=15)
run(ssh, f'cd {REMOTE_DIR} && tar xzf /tmp/rms-clipeconsult-deploy.tar.gz', timeout=120)
run(ssh, 'rm /tmp/rms-clipeconsult-deploy.tar.gz')

# Create fresh database directory
run(ssh, f'mkdir -p {DB_DIR}')

# Set env
run(ssh, f'echo "DATABASE_URL=file:{DB_DIR}/custom.db" > {REMOTE_DIR}/.env')
run(ssh, f'echo "PORT={PORT}" >> {REMOTE_DIR}/.env')

# Start with PM2
print(f'Starting PM2 on port {PORT}...')
run(ssh, f'cd {REMOTE_DIR} && HOSTNAME=0.0.0.0 PORT={PORT} pm2 start server.js --name rms-clipeconsult', timeout=15)
time.sleep(3)
run(ssh, 'pm2 save')

# Verify
print('Verifying...')
run(ssh, 'pm2 show rms-clipeconsult | grep status')
run(ssh, f'curl -s -o /dev/null -w "HTTP %{{http_code}}" http://localhost:{PORT}')

ssh.close()
print('Done! https://rms.clipeconsult.com is live.')