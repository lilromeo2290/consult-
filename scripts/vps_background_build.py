import paramiko
import time

def run_cmd(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"CMD: {cmd}")
    if out.strip(): print(f"OUT: {out[-2000:]}")
    if err.strip(): print(f"ERR: {err[-2000:]}")
    print("---")
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

sftp = ssh.open_sftp()

# Step 1: Upload modified files
print("=== UPLOADING MODIFIED FILES ===")
local_base = '/home/z/my-project'
remote_base = '/home/kpma-rms-build'

for local_rel, remote_rel in [
    ('src/components/rms/rms-layout.tsx', 'src/components/rms/rms-layout.tsx'),
    ('src/stores/app-store.ts', 'src/stores/app-store.ts'),
    ('src/app/page.tsx', 'src/app/page.tsx'),
]:
    local_path = local_base + '/' + local_rel
    remote_path = remote_base + '/' + remote_rel
    print(f"  Uploading {local_rel}")
    sftp.put(local_path, remote_path)

# Delete bp-payment.tsx
try:
    sftp.remove(remote_base + '/src/components/rms/bp-payment.tsx')
    print("  Deleted bp-payment.tsx")
except FileNotFoundError:
    print("  bp-payment.tsx not found (ok)")

sftp.close()
print("Files uploaded successfully")

# Step 2: Launch build in background with nohup
print("\n=== LAUNCHING BACKGROUND BUILD ===")
# Kill any previous build script
run_cmd('pkill -f vps_build_script.sh 2>/dev/null; echo ok')

# Create build+deploy script on VPS
build_script = '''#!/bin/bash
set -e
cd /home/kpma-rms-build
echo "[$(date)] Starting prisma generate..." >> /home/kpma-rms-build/build.log
npx prisma generate >> /home/kpma-rms-build/build.log 2>&1
echo "[$(date)] Starting next build..." >> /home/kpma-rms-build/build.log
npx next build >> /home/kpma-rms-build/build.log 2>&1
echo "[$(date)] Build complete. Deploying..." >> /home/kpma-rms-build/build.log

# Stop PM2
pm2 stop kpma-rms 2>/dev/null || true
pm2 delete kpma-rms 2>/dev/null || true

# Clean and redeploy
rm -rf /home/kpma-rms/* /home/kpma-rms/.* 2>/dev/null
cp -a /home/kpma-rms-build/.next/standalone/. /home/kpma-rms/
cp -r /home/kpma-rms-build/.next/static /home/kpma-rms/.next/static
cp -r /home/kpma-rms-build/public /home/kpma-rms/public

# Start PM2
cd /home/kpma-rms && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms

echo "[$(date)] Deploy complete!" >> /home/kpma-rms-build/build.log
curl -s -o /dev/null -w "%{http_code}" http://localhost:3008/ >> /home/kpma-rms-build/build.log
'''

stdin, stdout, stderr = ssh.exec_command('cat > /home/kpma-rms-build/vps_build_script.sh')
stdin.write(build_script)
stdin.channel.shutdown_write()
stdout.read()

run_cmd('chmod +x /home/kpma-rms-build/vps_build_script.sh')

# Clear old log
run_cmd('> /home/kpma-rms-build/build.log')

# Launch in background
run_cmd('nohup /home/kpma-rms-build/vps_build_script.sh &> /dev/null & echo $!')

print("Build is running in background. PID captured.")
print("Will check progress in ~60 seconds...")

ssh.close()
