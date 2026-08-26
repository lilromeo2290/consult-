import paramiko, time
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)
def r(c,t=30):
    i,o,e=ssh.exec_command(c,timeout=t)
    out=o.read().decode(); err=e.read().decode()
    print(f'>>> {c}'); print(out[-2000:] if out.strip() else ''); print(err[-500:] if err.strip() else ''); print('---'); return out

# First, restore the old working source files from the previous commit to test
print('=== REVERTING SOURCE TO WORKING STATE (with BP Payment) ===')
r('cd /home/kpma-rms-build && git log --oneline -3 2>/dev/null || echo "no git"')

# Since there is no git, re-upload the ORIGINAL working files
print('Will re-upload original files and rebuild to verify VPS builds work at all')

# Stop PM2 first
r('pm2 stop kpma-rms 2>/dev/null; pm2 delete kpma-rms 2>/dev/null')

# Free memory by checking what's using it
r('free -m')

ssh.close()
print('Done checking')
