import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)
sftp = ssh.open_sftp()

def r(c, t=15):
    i,o,e=ssh.exec_command(c,timeout=t)
    out=o.read().decode(); err=e.read().decode()
    print(f'>>> {c}'); print(out[-2000:] if out.strip() else ''); print(err[-500:] if err.strip() else ''); print('---'); return out

# Upload original files
print('=== UPLOADING ORIGINAL FILES ===')
sftp.put('/tmp/rms-layout.tsx.orig', '/home/kpma-rms-build/src/components/rms/rms-layout.tsx')
sftp.put('/tmp/app-store.ts.orig', '/home/kpma-rms-build/src/stores/app-store.ts')
sftp.put('/tmp/page.tsx.orig', '/home/kpma-rms-build/src/app/page.tsx')
sftp.put('/tmp/bp-payment.tsx.orig', '/home/kpma-rms-build/src/components/rms/bp-payment.tsx')
print('Files uploaded')

sftp.close()

# Clean and start build
print('=== CLEAN AND REBUILD ORIGINAL ===')
r('rm -rf /home/kpma-rms-build/.next')

script = '''#!/bin/bash
set -e
cd /home/kpma-rms-build
echo "[$(date)] prisma generate" > /tmp/rebuild.log
npx prisma generate >> /tmp/rebuild.log 2>&1
echo "[$(date)] next build" >> /tmp/rebuild.log
NODE_OPTIONS="--max-old-space-size=1024" npx next build >> /tmp/rebuild.log 2>&1
echo "[$(date)] BUILD EXIT=$?" >> /tmp/rebuild.log
'''
i,o,e = ssh.exec_command('cat > /tmp/rebuild.sh')
i.write(script)
i.channel.shutdown_write()
o.read()
r('chmod +x /tmp/rebuild.sh')
r('nohup /tmp/rebuild.sh &> /dev/null & echo $!')

ssh.close()
print('Build started. Check in 3 min.')
