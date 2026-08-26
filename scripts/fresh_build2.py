import paramiko,time
ssh=paramiko.SSHClient();ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy());ssh.connect('153.75.247.4',username='root',password='Do1_BuZe4_M1-V6v1_S4',timeout=10)
def r(c,t=60):
 i,o,e=ssh.exec_command(c,timeout=t);out=o.read().decode();err=e.read().decode();print(f'>>> {c}');print(out[-2000:] if out.strip() else '');print(err[-500:] if err.strip() else '');print('---');return out

print('=== STOP & CLEAN ===')
r('pm2 stop kpma-rms 2>/dev/null;pm2 delete kpma-rms 2>/dev/null')

print('=== FRESH CLONE ===')
r('rm -rf /home/kpma-rms-build-fresh && cd /home && git clone https://github.com/lilromeo2290/consult-.git kpma-rms-build-fresh 2>&1',t=120)

print('=== CHECKOUT COMMIT ===')
r('cd /home/kpma-rms-build-fresh && git checkout 14b4ee6 2>&1')

print('=== NPM INSTALL ===')
r('cd /home/kpma-rms-build-fresh && npm install 2>&1',t=180)

print('=== UPLOAD PRISMA ===')
sftp=ssh.open_sftp()
sftp.put('/home/z/my-project/prisma/schema.prisma','/home/kpma-rms-build-fresh/prisma/schema.prisma')
sftp.close()
print('Schema uploaded')

print('=== PRISMA GENERATE ===')
r('cd /home/kpma-rms-build-fresh && npx prisma generate 2>&1',t=60)

print('=== BUILD ===')
script='''#!/bin/bash
set -e
cd /home/kpma-rms-build-fresh
echo "[$(date)] starting" > /tmp/fresh.log
npx next build >> /tmp/fresh.log 2>&1
echo "[$(date)] EXIT=$?" >> /tmp/fresh.log
'''
i,o,e=ssh.exec_command('cat > /tmp/fresh.sh');i.write(script);i.channel.shutdown_write();o.read()
r('chmod +x /tmp/fresh.sh && nohup /tmp/fresh.sh &>/dev/null & echo $!')

ssh.close()
print('Done. Check: tail -f /tmp/fresh.log')
