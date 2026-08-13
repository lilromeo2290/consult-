import paramiko
import time
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

sftp = ssh.open_sftp()

def run_cmd(cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"CMD: {cmd}")
    if out.strip(): print(f"OUT: {out[-3000:]}")
    if err.strip(): print(f"ERR: {err[-3000:]}")
    print("---")
    return out, err

# Step 1: Upload modified files
print("=== UPLOADING MODIFIED FILES ===")
local_base = '/home/z/my-project'
remote_base = '/home/kpma-rms-build'

files_to_upload = [
    ('src/components/rms/rms-layout.tsx', 'src/components/rms/rms-layout.tsx'),
    ('src/stores/app-store.ts', 'src/stores/app-store.ts'),
    ('src/app/page.tsx', 'src/app/page.tsx'),
]

for local_rel, remote_rel in files_to_upload:
    local_path = os.path.join(local_base, local_rel)
    remote_path = os.path.join(remote_base, remote_rel)
    print(f"  Uploading {local_rel} -> {remote_path}")
    sftp.put(local_path, remote_path)

# Step 2: Delete bp-payment.tsx on VPS
print("\n=== DELETING bp-payment.tsx ON VPS ===")
try:
    sftp.remove(os.path.join(remote_base, 'src/components/rms/bp-payment.tsx'))
    print("  Deleted bp-payment.tsx")
except FileNotFoundError:
    print("  File not found (already deleted)")

sftp.close()

# Step 3: Run prisma generate (in case needed)
print("\n=== PRISMA GENERATE ===")
run_cmd('cd /home/kpma-rms-build && npx prisma generate 2>&1', timeout=60)

# Step 4: Build
print("\n=== RUNNING NEXT BUILD ===")
run_cmd('cd /home/kpma-rms-build && npx next build 2>&1', timeout=300)

# Step 5: Stop PM2
print("\n=== STOPPING PM2 ===")
run_cmd('pm2 stop kpma-rms 2>/dev/null; pm2 delete kpma-rms 2>/dev/null; echo done')

# Step 6: Redeploy
print("\n=== REDEPLOYING ===")
run_cmd('rm -rf /home/kpma-rms/* /home/kpma-rms/.* 2>/dev/null; echo cleaned')
run_cmd('cp -a /home/kpma-rms-build/.next/standalone/. /home/kpma-rms/')
run_cmd('cp -r /home/kpma-rms-build/.next/static /home/kpma-rms/.next/static')
run_cmd('cp -r /home/kpma-rms-build/public /home/kpma-rms/public')

# Step 7: Verify
print("\n=== VERIFY ===")
run_cmd('cat /home/kpma-rms/.next/BUILD_ID')
run_cmd('ls /home/kpma-rms/.next/static/')

# Step 8: Start PM2
print("\n=== STARTING PM2 ===")
run_cmd('cd /home/kpma-rms && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms')
time.sleep(5)

# Step 9: Check
print("\n=== STATUS ===")
run_cmd('pm2 list')
run_cmd('pm2 logs kpma-rms --lines 10 --nostream')
run_cmd('curl -s -o /dev/null -w "%{http_code}" http://localhost:3008/')

ssh.close()
print("\nAll done!")
