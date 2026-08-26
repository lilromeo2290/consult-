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

# Step 1: Verify build output exists
print("=== VERIFY BUILD OUTPUT ===")
run_cmd('ls /home/kpma-rms-build/.next/standalone/server.js')
run_cmd('cat /home/kpma-rms-build/.next/BUILD_ID')

# Step 2: Clean deploy dir
print("=== CLEAN DEPLOY DIR ===")
run_cmd('rm -rf /home/kpma-rms/* /home/kpma-rms/.* 2>/dev/null; echo cleaned')

# Step 3: Copy standalone (with cp -a to include hidden .next)
print("=== COPY STANDALONE ===")
run_cmd('cp -a /home/kpma-rms-build/.next/standalone/. /home/kpma-rms/')

# Step 4: Verify .next in deploy
print("=== VERIFY .next ===")
run_cmd('cat /home/kpma-rms/.next/BUILD_ID')

# Step 5: Copy static files
print("=== COPY STATIC ===")
run_cmd('cp -r /home/kpma-rms-build/.next/static /home/kpma-rms/.next/static')

# Step 6: Copy public
print("=== COPY PUBLIC ===")
run_cmd('cp -r /home/kpma-rms-build/public /home/kpma-rms/public')

# Step 7: Ensure .env exists
print("=== CHECK .ENV ===")
run_cmd('cat /home/kpma-rms/.env 2>/dev/null || echo "NO ENV"')

# Step 8: Start PM2
print("=== START PM2 ===")
run_cmd('cd /home/kpma-rms && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms')
time.sleep(5)

# Step 9: Verify
print("=== STATUS ===")
run_cmd('pm2 list | grep kpma')
run_cmd('pm2 logs kpma-rms --lines 10 --nostream')
run_cmd('curl -s -o /dev/null -w "%{http_code}" http://localhost:3008/')

ssh.close()
print("Done!")
