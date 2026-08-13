import paramiko

def run_cmd(cmd, timeout=15):
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

# Check if build process is still running
run_cmd('ps aux | grep vps_build_script | grep -v grep')

# Check log
run_cmd('tail -20 /home/kpma-rms-build/build.log')

# Check PM2 status
run_cmd('pm2 list 2>/dev/null | grep kpma')

ssh.close()