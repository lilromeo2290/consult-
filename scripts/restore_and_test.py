import paramiko, time, os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)
sftp = ssh.open_sftp()

def r(c, t=15):
    i,o,e=ssh.exec_command(c,timeout=t)
    out=o.read().decode(); err=e.read().decode()
    print(f'>>> {c}'); print(out[-2000:] if out.strip() else ''); print(err[-500:] if err.strip() else ''); print('---'); return out

def upload(local_rel, remote_rel):
    lp = '/home/z/my-project/' + local_rel
    rp = '/home/kpma-rms-build/' + remote_rel
    sftp.put(lp, rp)
    print(f'  Uploaded {local_rel}')

# Restore ORIGINAL files from git (with BP Payment)
print('=== RESTORING ORIGINAL SOURCE FILES ===')
r('cd /home/z/my-project && git show 14b4ee6:src/components/rms/rms-layout.tsx > /tmp/rms-layout.tsx.orig')
r('cd /home/z/my-project && git show 14b4ee6:src/stores/app-store.ts > /tmp/app-store.ts.orig')
r('cd /home/z/my-project && git show 14b4ee6:src/app/page.tsx > /tmp/page.tsx.orig')

# Check we have the originals
r('head -3 /tmp/rms-layout.tsx.orig /tmp/app-store.ts.orig /tmp/page.tsx.orig')

# Upload originals to VPS
print('=== UPLOADING ORIGINAL FILES TO VPS ===')
sftp.put('/tmp/rms-layout.tsx.orig', '/home/kpma-rms-build/src/components/rms/rms-layout.tsx')
sftp.put('/tmp/app-store.ts.orig', '/home/kpma-rms-build/src/stores/app-store.ts')
sftp.put('/tmp/page.tsx.orig', '/home/kpma-rms-build/src/app/page.tsx')

# Also restore bp-payment.tsx
print('=== RESTORING bp-payment.tsx ===')
r('cd /home/z/my-project && git show 386ef51:src/components/rms/bp-payment.tsx > /tmp/bp-payment.tsx.orig')
sftp.put('/tmp/bp-payment.tsx.orig', '/home/kpma-rms-build/src/components/rms/bp-payment.tsx')

sftp.close()
print('Files restored')

# Clear old build artifacts and rebuild
print('=== CLEAN BUILD ===')
r('rm -rf /home/kpma-rms-build/.next')
r('rm -f /home/kpma-rms-build/.next/lock')

# Create build script
script = '''#!/bin/bash
set -e
cd /home/kpma-rms-build
echo "[$(date)] Starting prisma generate..." >> /tmp/rebuild.log
npx prisma generate >> /tmp/rebuild.log 2>&1
echo "[$(date)] Starting next build..." >> /tmp/rebuild.log
NODE_OPTIONS="--max-old-space-size=1024" npx next build >> /tmp/rebuild.log 2>&1
echo "[$(date)] Build done, exit=$?" >> /tmp/rebuild.log
'''
i,o,e = ssh.exec_command('cat > /tmp/rebuild.sh')
i.write(script)
i.channel.shutdown_write()
o.read()
r('chmod +x /tmp/rebuild.sh')
r('> /tmp/rebuild.log')
r('nohup /tmp/rebuild.sh &> /dev/null & echo $!')

print('Build started in background. PID:') 
ssh.close()
print('Will check in 3 minutes...')
