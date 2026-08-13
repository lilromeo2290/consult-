import paramiko
import time

def run_cmd(cmd, timeout=15):
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

# Kill crash-looping PM2 process
print("=== STOPPING CRASH-LOOPING PM2 ===")
run_cmd('pm2 stop kpma-rms 2>/dev/null; pm2 delete kpma-rms 2>/dev/null; echo done')

# Kill any lingering build processes
print("=== KILLING OLD BUILD PROCESSES ===")
run_cmd('pkill -f "next build" 2>/dev/null; pkill -f vps_build_script 2>/dev/null; echo done')

# Remove lock file
print("=== REMOVING LOCK FILE ===")
run_cmd('rm -f /home/kpma-rms-build/.next/lock; echo removed')

# Clear log and restart build in background
print("=== RESTARTING BUILD ===")
run_cmd('> /home/kpma-rms-build/build.log')
run_cmd('nohup /home/kpma-rms-build/vps_build_script.sh &> /dev/null & echo $!')

print("Build restarted. Waiting 90 seconds...")
ssh.close()