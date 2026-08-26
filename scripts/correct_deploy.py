import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)
sftp = ssh.open_sftp()

def r(c, t=30):
    i,o,e=ssh.exec_command(c,timeout=t);out=o.read().decode();err=e.read().decode();print(f'>>> {c}');print(out[-2000:] if out.strip() else '');print(err[-1000:] if err.strip() else '');print('---');return out

print('=== CHECK ENVIRONMENT ===')
r('which bun 2>/dev/null || echo NO_BUN')
r('node -v')
r('npm -v')

print('=== STOP OLD PROCESS ===')
r('pm2 stop kpma-rms 2>/dev/null; pm2 delete kpma-rms 2>/dev/null')

print('=== CLONE CORRECT REPO ===')
r('rm -rf /home/rms-correct')
# Clone the Rev_Mgnt_Sys repo
r('cd /home && git clone https://github.com/lilromeo2290/Rev_Mgnt_Sys.git rms-correct 2>&1', t=120)

print('=== UPLOAD MODIFIED LAYOUT (BP Payment removed from NAV_ITEMS only) ===')
# Read local file, modify, upload
local_layout = '/home/z/Rev_Mgnt_Sys/src/components/rms/rms-layout.tsx'
with open(local_layout) as f:
    content = f.read()

# Remove just the BP Payment nav item line
content = content.replace(
    "  { label: 'BP Payment', page: 'bp-payment', icon: Wallet },\n",
    ''
)

# Write to temp and upload
with open('/tmp/rms-layout-nobp.tsx', 'w') as f:
    f.write(content)
sftp.put('/tmp/rms-layout-nobp.tsx', '/home/rms-correct/src/components/rms/rms-layout.tsx')
print('Uploaded modified layout')

print('=== VERIFY CHANGE ===')
r("grep -c 'BP Payment' /home/rms-correct/src/components/rms/rms-layout.tsx")
r("grep 'bp-payment' /home/rms-correct/src/components/rms/rms-layout.tsx")

sftp.close()

print('=== NPM CI (exact dependency install) ===')
r('cd /home/rms-correct && npm ci --production=false 2>&1 | tail -5', t=180)

print('=== PRISMA ===')
r('cd /home/rms-correct && npx prisma generate 2>&1 | tail -5', t=60)
r('cd /home/rms-correct && npx prisma db push --accept-data-loss 2>&1 | tail -10', t=60)

print('=== BUILD (background) ===')
script = '''#!/bin/bash
set -e
cd /home/rms-correct
echo "[$(date)] build starting" > /tmp/correct-build.log
npx next build >> /tmp/correct-build.log 2>&1
echo "[$(date)] EXIT=$?" >> /tmp/correct-build.log
'''
i,o,e = ssh.exec_command('cat > /tmp/correct-build.sh')
i.write(script); i.channel.shutdown_write(); o.read()
r('chmod +x /tmp/correct-build.sh && nohup /tmp/correct-build.sh &> /dev/null & echo $!')

ssh.close()
print('Build started. Check: tail -f /tmp/correct-build.log')
