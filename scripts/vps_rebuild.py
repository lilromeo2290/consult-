import paramiko
import time

def run_cmd(ssh, cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"CMD: {cmd}")
    if out.strip(): print(f"OUT: {out[-3000:]}")
    if err.strip(): print(f"ERR: {err[-3000:]}")
    print("---")
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

# Check what's in the build dir
print("=== CHECKING BUILD DIR ===")
run_cmd(ssh, 'ls -la /home/kpma-rms-build/ | head -20')
run_cmd(ssh, 'ls /home/kpma-rms-build/.git 2>/dev/null && echo "HAS GIT" || echo "NO GIT"')
run_cmd(ssh, 'cat /home/kpma-rms-build/package.json | head -5')

ssh.close()
