import paramiko, time, json, os, subprocess

HOST, USER, PASS = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'
BASE = '/home/consult-rms'
SA = f'{BASE}/.next/standalone'

def ssh_cmd(ssh, cmd):
    si, so, se = ssh.exec_command(cmd, timeout=60)
    return so.read().decode().strip()

# Create tarballs from correct paths
os.makedirs('/tmp', exist_ok=True)
subprocess.run(['tar', 'czf', '/tmp/rms-deploy.tar.gz', '-C', '.next', 'standalone'], cwd='/home/z/my-project', check=True)
subprocess.run(['tar', 'czf', '/tmp/rms-static.tar.gz', '-C', '.next', 'static'], cwd='/home/z/my-project', check=True)
print('Tarballs created.')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)
print('Connected.')

# Clean and recreate
ssh_cmd(ssh, f'rm -rf {SA} && mkdir -p {SA}')
print('Old build removed.')

# Upload standalone
sftp = ssh.open_sftp()
remote_tar = f'{BASE}/rms-deploy.tar.gz'
sftp.put('/tmp/rms-deploy.tar.gz', remote_tar)
sftp.close()
print('Standalone uploaded.')

ssh_cmd(ssh, f'tar xzf {remote_tar} -C {SA} --strip-components=1 && rm -f {remote_tar}')
print('Standalone extracted.')

# Upload statics
sftp2 = ssh.open_sftp()
remote_st = f'{BASE}/rms-static.tar.gz'
sftp2.put('/tmp/rms-static.tar.gz', remote_st)
sftp2.close()
ssh_cmd(ssh, f'mkdir -p {SA}/.next && tar xzf {remote_st} -C {SA}/.next --strip-components=1 && rm -f {remote_st}')
print('Statics uploaded.')

# Copy statics and BUILD_ID to base .next
ssh_cmd(ssh, f'mkdir -p {BASE}/.next')
ssh_cmd(ssh, f'cp {SA}/.next/BUILD_ID {BASE}/.next/BUILD_ID 2>/dev/null || true')
ssh_cmd(ssh, f'cp -r {SA}/.next/static {BASE}/.next/static 2>/dev/null || true')

# Write .env to BOTH standalone dir AND base dir (PM2 reads from cwd = BASE)
with open('/tmp/rms-env-line.txt', 'w') as f:
    f.write('DATABASE_URL=file:/home/consult-rms/data/rms.db\n')
sftp3 = ssh.open_sftp()
sftp3.put('/tmp/rms-env-line.txt', f'{SA}/.env')
sftp3.put('/tmp/rms-env-line.txt', f'{BASE}/.env')
sftp3.close()

# Copy server.js to base for PM2 cwd
ssh_cmd(ssh, f'cp {SA}/server.js {BASE}/server.js')

bid = ssh_cmd(ssh, f'cat {SA}/.next/BUILD_ID')
print(f'BUILD_ID: {bid}')

# Restart with correct PORT and DATABASE_URL as env vars (more reliable than .env file)
ssh_cmd(ssh, 'pm2 delete consult-rms 2>/dev/null')
ssh_cmd(ssh, f'cd {BASE} && DATABASE_URL="file:{BASE}/data/rms.db" PORT=3001 pm2 start server.js --name consult-rms')
time.sleep(4)

status = ssh_cmd(ssh, 'pm2 jlist')
try:
    apps = json.loads(status)
    for a in apps:
        if a['name'] == 'consult-rms':
            print(f"Status: {a['pm2_env']['status']}")
except: pass

# Check HTTP
code = ssh_cmd(ssh, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/')
print(f'HTTP: {code}')

err = ssh_cmd(ssh, 'tail -5 /root/.pm2/logs/consult-rms-error.log 2>/dev/null')
if err: print(f'Errors: {err[:300]}')
else: print('No errors.')

ssh_cmd(ssh, 'pm2 save')
ssh.close()
print('Deploy complete!')
