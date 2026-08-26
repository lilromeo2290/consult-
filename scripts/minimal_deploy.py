import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)
sftp = ssh.open_sftp()

def r(c, t=15):
    i,o,e=ssh.exec_command(c,timeout=t)
    out=o.read().decode(); err=e.read().decode()
    print(f'>>> {c}'); print(out[-2000:] if out.strip() else ''); print(err[-500:] if err.strip() else ''); print('---'); return out

# Upload only the modified layout file
print('=== UPLOADING MINIMAL CHANGE ===')
sftp.put('/tmp/rms-layout-minimal.tsx', '/home/kpma-rms-build/src/components/rms/rms-layout.tsx')
print('Uploaded rms-layout.tsx (1 line removed)')
sftp.close()

# Verify it looks correct
r('grep -n "BP Payment" /home/kpma-rms-build/src/components/rms/rms-layout.tsx || echo "NO BP Payment in NAV_ITEMS (correct)"')
r('grep -c "NAV_ITEMS" /home/kpma-rms-build/src/components/rms/rms-layout.tsx')

# Clean and rebuild
print('=== CLEAN REBUILD ===')
r('rm -rf /home/kpma-rms-build/.next')

script = '''#!/bin/bash
set -e
cd /home/kpma-rms-build
echo "[$(date)] prisma" > /tmp/rebuild2.log
npx prisma generate >> /tmp/rebuild2.log 2>&1
echo "[$(date)] build" >> /tmp/rebuild2.log
npx next build >> /tmp/rebuild2.log 2>&1
echo "[$(date)] EXIT=$?" >> /tmp/rebuild2.log
'''
i,o,e = ssh.exec_command('cat > /tmp/rebuild2.sh')
i.write(script)
i.channel.shutdown_write()
o.read()
r('chmod +x /tmp/rebuild2.sh')
r('nohup /tmp/rebuild2.sh &> /dev/null & echo $!')

ssh.close()
print('Build started. Wait ~3 min then check: tail -20 /tmp/rebuild2.log')
