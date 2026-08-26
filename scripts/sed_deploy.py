import paramiko
ssh=paramiko.SSHClient();ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy());ssh.connect('153.75.247.4',username='root',password='Do1_BuZe4_M1-V6v1_S4',timeout=10)

def r(c,t=60):
 i,o,e=ssh.exec_command(c,timeout=t);out=o.read().decode();err=e.read().decode();print(f'>>> {c}');print(out[-2000:] if out.strip() else '');print(err[-500:] if err.strip() else '');print('---');return out

# Check if clone exists, if not clone it
r('ls /home/rms-correct/package.json 2>/dev/null && echo EXISTS || (cd /home && git clone --depth 3 https://github.com/lilromeo2290/Rev_Mgnt_Sys.git rms-correct 2>&1)',t=120)

# Remove BP Payment from NAV_ITEMS using sed
print('=== REMOVE BP PAYMENT WITH SED ===')
r("sed -i \"/BP Payment.*bp-payment.*Wallet/d\" /home/rms-correct/src/components/rms/rms-layout.tsx")
r("grep 'BP Payment\|bp-payment' /home/rms-correct/src/components/rms/rms-layout.tsx || echo 'REMOVED OK'")

# Create full deploy script
print('=== CREATE FULL SCRIPT ===')
script='''#!/bin/bash
set -e
cd /home/rms-correct
echo "[$(date)] npm ci" > /tmp/correct-deploy.log
npm ci --production=false >> /tmp/correct-deploy.log 2>&1
echo "[$(date)] prisma" >> /tmp/correct-deploy.log
npx prisma generate >> /tmp/correct-deploy.log 2>&1
npx prisma db push --accept-data-loss >> /tmp/correct-deploy.log 2>&1
echo "[$(date)] build" >> /tmp/correct-deploy.log
npx next build >> /tmp/correct-deploy.log 2>&1
echo "[$(date)] EXIT=$?" >> /tmp/correct-deploy.log
rm -rf /home/kpma-rms; mkdir -p /home/kpma-rms
cp -a .next/standalone/. /home/kpma-rms/
cp -r .next/static /home/kpma-rms/.next/static
cp -r public /home/kpma-rms/public
echo "DATABASE_URL=file:/home/rms-correct/db/custom.db" > /home/kpma-rms/.env
cd /home/kpma-rms && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms
echo "[$(date)] PM2 started" >> /tmp/correct-deploy.log
sleep 3
curl -s -o /dev/null -w "HTTP:%{http_code}" http://localhost:3008/ >> /tmp/correct-deploy.log
echo "[$(date)] DONE" >> /tmp/correct-deploy.log
'''
i,o,e=ssh.exec_command('cat > /tmp/correct-deploy.sh')
i.write(script);i.channel.shutdown_write();o.read()
r('chmod +x /tmp/correct-deploy.sh && pkill -f correct-deploy 2>/dev/null; nohup /tmp/correct-deploy.sh &> /dev/null & echo $!')

ssh.close()
print('Full pipeline running. Check: tail -f /tmp/correct-deploy.log')