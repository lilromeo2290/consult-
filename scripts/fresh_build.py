import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)

# Upload prisma schema first
sftp = ssh.open_sftp()

def r(c, t=30):
    i,o,e=ssh.exec_command(c,timeout=t)
    out=o.read().decode(); err=e.read().decode()
    print(f'>>> {c}'); print(out[-3000:] if out.strip() else ''); print(err[-1000:] if err.strip() else ''); print('---'); return out

print('=== STEP 1: STOP CURRENT ===')
r('pm2 stop kpma-rms 2>/dev/null; pm2 delete kpma-rms 2>/dev/null')

print('=== STEP 2: FRESH CLONE ===')
r('rm -rf /home/kpma-rms-build-fresh')
r('cd /home && git clone https://github.com/lilromeo2290/consult-.git kpma-rms-build-fresh 2>&1')

print('=== STEP 3: CHECK OUT SPECIFIC COMMIT (latest before my changes) ===')
r('cd /home/kpma-rms-build-fresh && git checkout 14b4ee6 2>&1')

print('=== STEP 4: INSTALL DEPS ===')
r('cd /home/kpma-rms-build-fresh && npm install 2>&1', t=120)

print('=== STEP 5: UPLOAD PRISMA SCHEMA ===')
sftp.put('/home/z/my-project/prisma/schema.prisma', '/home/kpma-rms-build-fresh/prisma/schema.prisma')
print('Schema uploaded')

print('=== STEP 6: REMOVE GLOBAL NEXT ===')
r('npm uninstall -g next 2>/dev/null; echo done')

print('=== STEP 7: ENSURE CORRECT NEXT VERSION ===')
r('cd /home/kpma-rms-build-fresh && npx next --version')

sftp.close()

print('=== STEP 8: PRISMA GENERATE ===')
r('cd /home/kpma-rms-build-fresh && npx prisma generate 2>&1', t=60)

print('=== STEP 9: START BUILD IN BACKGROUND ===')
script = '''#!/bin/bash
set -e
cd /home/kpma-rms-build-fresh
echo "[$(date)] Build starting" > /tmp/fresh-build.log
npx next build >> /tmp/fresh-build.log 2>&1
echo "[$(date)] EXIT=$?" >> /tmp/fresh-build.log
'''
i,o,e = ssh.exec_command('cat > /tmp/fresh-build.sh')
i.write(script); i.channel.shutdown_write(); o.read()
r('chmod +x /tmp/fresh-build.sh')
r('nohup /tmp/fresh-build.sh &> /dev/null & echo $!')

ssh.close()
print('Fresh build started! Check with: tail -f /tmp/fresh-build.log')
