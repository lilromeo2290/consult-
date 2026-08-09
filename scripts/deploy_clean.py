import paramiko, os, sys, time, subprocess

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_APP = '/home/consult-rms'
PROJECT_DIR = '/home/z/my-project'
TAR_PATH = f'{PROJECT_DIR}/deploy.tar.gz'

def run(ssh, cmd, timeout=30):
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode()[:500]
        err = stderr.read().decode()[:500]
        print(f'  >> {cmd[:100]}')
        if out.strip(): print(f'  OUT: {out}')
        if err.strip(): print(f'  ERR: {err}')
        return out + err
    except Exception as e:
        print(f'  TIMEOUT/ERR on: {cmd[:80]} -> {e}')
        return ''

print('Step 0: Connecting...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)
print('  Connected!')

# 0.5 Build fresh deploy tar from .next output
print('Step 0.5: Build fresh deploy tar...')
next_dir = f'{PROJECT_DIR}/.next'
if not os.path.exists(f'{next_dir}/standalone'):
    print('  ERROR: .next/standalone not found. Run "npx next build" first.')
    sys.exit(1)
os.system(f'cd {next_dir} && tar -czf {TAR_PATH} standalone/ static/')
tar_sz = os.path.getsize(TAR_PATH)
print(f'  Created {TAR_PATH} ({tar_sz:,} bytes)')
print(f'  BUILD_ID: {open(f"{next_dir}/BUILD_ID").read().strip()}')

# 1. Stop PM2
print('Step 1: Stop PM2')
run(ssh, f'cd {REMOTE_APP} && pm2 stop consult-rms 2>&1')
time.sleep(1)

# 2. Nuke old standalone
print('Step 2: Nuke old standalone')
run(ssh, f'rm -rf {REMOTE_APP}/standalone', timeout=60)

# 3. Upload gzipped tar
print('Step 3: Uploading (this takes a while for 63MB)...')
sftp = ssh.open_sftp()
remote_tar = f'{REMOTE_APP}/deploy.tar.gz'
# Use put with callback for progress
start = time.time()
sftp.put(TAR_PATH, remote_tar)
elapsed = time.time() - start
local_sz = os.path.getsize(TAR_PATH)
remote_sz = sftp.stat(remote_tar).st_size
print(f'  Uploaded {local_sz:,} bytes in {elapsed:.1f}s ({local_sz/(elapsed*1024*1024):.1f} MB/s)')
print(f'  Size match: {local_sz == remote_sz}')
sftp.close()

# 4. Extract
print('Step 4: Extracting...')
run(ssh, f'cd {REMOTE_APP} && tar -xzf deploy.tar.gz', timeout=120)

# 5. Copy static files into standalone/.next/static
print('Step 5: Copy static files...')
run(ssh, f'cp -r {REMOTE_APP}/static {REMOTE_APP}/standalone/.next/static', timeout=60)
run(ssh, f'ls {REMOTE_APP}/standalone/.next/static/ 2>&1 | wc -l')

# 6. Fix .env to point to server database
print('Step 6: Fix .env for production DB...')
run(ssh, f'echo "DATABASE_URL=file:/home/consult-rms/data/rms.db" > {REMOTE_APP}/standalone/.env')
run(ssh, f'cat {REMOTE_APP}/standalone/.env')

# 7. Cleanup tar
print('Step 7: Cleanup...')
run(ssh, f'rm -rf {REMOTE_APP}/deploy.tar.gz {REMOTE_APP}/static')

# 8. Verify prisma client
print('Step 8: Verify Prisma client...')
run(ssh, f'ls {REMOTE_APP}/standalone/node_modules/@prisma/client/default.js 2>&1')
run(ssh, f'ls {REMOTE_APP}/standalone/node_modules/.prisma/client/index.js 2>&1')

# 9. Delete old PM2 process and start fresh
print('Step 9: Restart PM2 (fresh)...')
run(ssh, 'pm2 delete consult-rms 2>&1')
time.sleep(1)
run(ssh, f'cd {REMOTE_APP}/standalone && PORT=3001 pm2 start server.js --name consult-rms 2>&1')
time.sleep(3)
run(ssh, 'pm2 save 2>&1')

# 10. Status
print('Step 10: PM2 Status...')
run(ssh, 'pm2 status consult-rms 2>&1')

# 11. Test API
print('Step 11: Test API...')
run(ssh, 'curl -s -m 10 "http://localhost:3001/api/rms-data?key=rates" 2>&1')

# 12. Check logs
print('Step 12: Error logs...')
run(ssh, 'pm2 logs consult-rms --err --lines 5 --nostream 2>&1')

print('DEPLOY COMPLETE')
ssh.close()
