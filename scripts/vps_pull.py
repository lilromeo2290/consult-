import paramiko

def run_cmd(ssh, cmd, timeout=60):
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

print("=== PULLING LATEST CODE ===")
run_cmd(ssh, 'cd /home/kpma-rms-build && git pull origin main 2>&1')

ssh.close()
