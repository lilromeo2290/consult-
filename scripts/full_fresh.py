import paramiko
ssh=paramiko.SSHClient();ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy());ssh.connect('153.75.247.4',username='root',password='Do1_BuZe4_M1-V6v1_S4',timeout=10)
def r(c,t=30):
 i,o,e=ssh.exec_command(c,timeout=t);out=o.read().decode();err=e.read().decode();print(f'>>> {c}');print(out[-2000:] if out.strip() else '');print(err[-500:] if err.strip() else '');print('---');return out

# Use the existing fresh clone (at HEAD which has BP Payment removed)
print('=== USING FRESH CLONE ===')
r('cd /home/kpma-rms-build-fresh && git log --oneline -3')

# Upload prisma schema
print('=== UPLOAD PRISMA ===')
sftp=ssh.open_sftp()
sftp.put('/home/z/my-project/prisma/schema.prisma','/home/kpma-rms-build-fresh/prisma/schema.prisma')
sftp.close()
print('Done')

# Create full build script
script='''#!/bin/bash
set -e
cd /home/kpma-rms-build-fresh
echo "[$(date)] npm install starting" > /tmp/fresh.log
npm install >> /tmp/fresh.log 2>&1
echo "[$(date)] npm install done" >> /tmp/fresh.log
npm uninstall -g next 2>/dev/null || true
echo "[$(date)] prisma generate" >> /tmp/fresh.log
npx prisma generate >> /tmp/fresh.log 2>&1
echo "[$(date)] next build" >> /tmp/fresh.log
npx next build >> /tmp/fresh.log 2>&1
echo "[$(date)] BUILD EXIT=$?" >> /tmp/fresh.log

# Deploy
echo "[$(date)] deploying" >> /tmp/fresh.log
pm2 stop kpma-rms 2>/dev/null; pm2 delete kpma-rms 2>/dev/null
rm -rf /home/kpma-rms/* /home/kpma-rms/.* 2>/dev/null
cp -a .next/standalone/. /home/kpma-rms/
cp -r .next/static /home/kpma-rms/.next/static
cp -r public /home/kpma-rms/public
echo "DATABASE_URL=file:/home/z/my-project/db/custom.db" > /home/kpma-rms/.env
cd /home/kpma-rms && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms
echo "[$(date)] ALL DONE" >> /tmp/fresh.log
curl -s -o /dev/null -w "HTTP:%{http_code}" http://localhost:3008/ >> /tmp/fresh.log
'''
i,o,e=ssh.exec_command('cat > /tmp/full-fresh.sh')
i.write(script);i.channel.shutdown_write();o.read()
r('chmod +x /tmp/full-fresh.sh')
r('pkill -f full-fresh 2>/dev/null; nohup /tmp/full-fresh.sh &> /dev/null & echo $!')

ssh.close()
print('Full fresh build+deploy running in background. Check: tail -f /tmp/fresh.log')