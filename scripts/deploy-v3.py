import paramiko, time, json, os

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

ssh_cmd(ssh, f'rm -rf {SA} && mkdir -p {SA}')
print('Old build removed.')

sftp = ssh.open_sftp()
remote_tar = f'{BASE}/rms-deploy.tar.gz'
sftp.put('/tmp/rms-deploy.tar.gz', remote_tar)
sftp.close()
print('Standalone uploaded.')

ssh_cmd(ssh, f'mkdir -p {SA} && tar xzf {remote_tar} -C {SA} --strip-components=1 && rm -f {remote_tar}')
print('Standalone extracted.')

sftp2 = ssh.open_sftp()
remote_st = f'{BASE}/rms-static.tar.gz'
sftp2.put('/tmp/rms-static.tar.gz', remote_st)
sftp2.close()
ssh_cmd(ssh, f'mkdir -p {SA}/.next && tar xzf {remote_st} -C {SA}/.next && rm -f {remote_st}')
print('Statics uploaded.')

ssh_cmd(ssh, f'mkdir -p {BASE}/.next')
ssh_cmd(ssh, f'cp {SA}/.next/BUILD_ID {BASE}/.next/BUILD_ID 2>/dev/null || true')
ssh_cmd(ssh, f'cp -r {SA}/.next/static {BASE}/.next/static 2>/dev/null || true')

with open('/tmp/rms-env-line.txt', 'w') as f:
    f.write('DATABASE_URL=file:/home/consult-rms/data/rms.db\n')
sftp3 = ssh.open_sftp()
sftp3.put('/tmp/rms-env-line.txt', f'{SA}/.env')
sftp3.close()

ssh_cmd(ssh, f'cp {SA}/server.js {BASE}/server.js')

bid = ssh_cmd(ssh, f'cat {SA}/.next/BUILD_ID')
print(f'BUILD_ID: {bid}')

ssh_cmd(ssh, 'pm2 restart consult-rms')
time.sleep(4)

status = ssh_cmd(ssh, 'pm2 jlist')
try:
    apps = json.loads(status)
    for a in apps:
        if a['name'] == 'consult-rms':
            print(f"Status: {a['pm2_env']['status']}")
except: pass

err = ssh_cmd(ssh, 'tail -5 /root/.pm2/logs/consult-rms-error.log 2>/dev/null')
if err: print(f'Errors: {err[:300]}')
else: print('No errors.')

ssh.close()
print('Deploy complete!')
