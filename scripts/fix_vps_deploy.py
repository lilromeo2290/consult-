import paramiko
import time

def run_cmd(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"CMD: {cmd}")
    if out.strip():
        print(f"OUT: {out}")
    if err.strip():
        print(f"ERR: {err}")
    print("---")
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

# Step 1: Stop PM2
print("=== STOPPING PM2 ===")
run_cmd(ssh, 'pm2 stop kpma-rms 2>/dev/null; pm2 delete kpma-rms 2>/dev/null; echo done')

# Step 2: Clean deploy directory completely
print("\n=== CLEANING DEPLOY DIRECTORY ===")
run_cmd(ssh, 'rm -rf /home/kpma-rms/* /home/kpma-rms/.* 2>/dev/null; echo cleaned')

# Step 3: Copy standalone output (including hidden .next dir)
print("\n=== COPYING STANDALONE OUTPUT (with dotfiles) ===")
# Use rsync or explicit cp for hidden dirs
run_cmd(ssh, 'cp -a /home/kpma-rms-build/.next/standalone/. /home/kpma-rms/')

# Step 4: Verify .next exists in deploy
print("\n=== VERIFY .next STRUCTURE ===")
run_cmd(ssh, 'ls -la /home/kpma-rms/')
run_cmd(ssh, 'ls -la /home/kpma-rms/.next/')
run_cmd(ssh, 'cat /home/kpma-rms/.next/BUILD_ID')

# Step 5: Copy static files into .next/static
print("\n=== COPYING STATIC FILES ===")
run_cmd(ssh, 'cp -r /home/kpma-rms-build/.next/static /home/kpma-rms/.next/static')

# Step 6: Copy public directory if not already present
print("\n=== ENSURING PUBLIC DIRECTORY ===")
run_cmd(ssh, 'ls /home/kpma-rms/public/ 2>/dev/null || cp -r /home/kpma-rms-build/public /home/kpma-rms/public')
run_cmd(ssh, 'ls /home/kpma-rms/public/')

# Step 7: Ensure .env file exists
print("\n=== CHECKING .ENV ===")
run_cmd(ssh, 'cat /home/kpma-rms/.env 2>/dev/null || echo "NO .env FILE"')

# Step 8: Verify final structure
print("\n=== FINAL DEPLOY STRUCTURE ===")
run_cmd(ssh, 'ls /home/kpma-rms/.next/')
run_cmd(ssh, 'ls /home/kpma-rms/.next/static/')

# Step 9: Start PM2
print("\n=== STARTING PM2 ===")
run_cmd(ssh, 'cd /home/kpma-rms && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms')
time.sleep(5)

# Step 10: Check status and logs
print("\n=== PM2 STATUS ===")
run_cmd(ssh, 'pm2 list')
run_cmd(ssh, 'pm2 logs kpma-rms --lines 15 --nostream')

# Step 11: Test locally
print("\n=== LOCAL CURL TEST ===")
run_cmd(ssh, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3008/')

ssh.close()
print("\nDone!")
