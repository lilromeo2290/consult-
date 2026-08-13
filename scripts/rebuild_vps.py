import paramiko
import time

def run_cmd(ssh, cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"CMD: {cmd}")
    if out.strip():
        print(f"OUT: {out[-2000:]}")  # Last 2000 chars
    if err.strip():
        print(f"ERR: {err[-2000:]}")
    print("---")
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

# Step 1: Pull latest code
print("=== PULLING LATEST CODE ===")
run_cmd(ssh, 'cd /home/kpma-rms-build && git pull origin main')

# Step 2: Rebuild on VPS
print("\n=== RUNNING NEXT BUILD ON VPS ===")
run_cmd(ssh, 'cd /home/kpma-rms-build && npx next build 2>&1', timeout=300)

# Step 3: Stop current PM2 process
print("\n=== STOPPING PM2 ===")
run_cmd(ssh, 'pm2 stop kpma-rms 2>/dev/null; pm2 delete kpma-rms 2>/dev/null; echo done')

# Step 4: Clean and redeploy
print("\n=== REDEPLOYING ===")
run_cmd(ssh, 'rm -rf /home/kpma-rms/* /home/kpma-rms/.* 2>/dev/null; echo cleaned')
run_cmd(ssh, 'cp -a /home/kpma-rms-build/.next/standalone/. /home/kpma-rms/')
run_cmd(ssh, 'cp -r /home/kpma-rms-build/.next/static /home/kpma-rms/.next/static')
run_cmd(ssh, 'cp -r /home/kpma-rms-build/public /home/kpma-rms/public')

# Step 5: Verify .next structure
print("\n=== VERIFY DEPLOY ===")
run_cmd(ssh, 'ls /home/kpma-rms/.next/BUILD_ID')
run_cmd(ssh, 'ls /home/kpma-rms/.next/static/')

# Step 6: Start PM2
print("\n=== STARTING PM2 ===")
run_cmd(ssh, 'cd /home/kpma-rms && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms')
time.sleep(5)

# Step 7: Check status
print("\n=== PM2 STATUS ===")
run_cmd(ssh, 'pm2 list')
run_cmd(ssh, 'pm2 logs kpma-rms --lines 10 --nostream')

# Step 8: Test
print("\n=== CURL TEST ===")
run_cmd(ssh, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3008/')

ssh.close()
print("\nAll done!")
