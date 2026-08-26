import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)

def r(c, t=15):
    i,o,e=ssh.exec_command(c,timeout=t)
    out=o.read().decode(); err=e.read().decode()
    print(f'>>> {c}'); print(out[-3000:] if out.strip() else ''); print(err[-1000:] if err.strip() else ''); print('---'); return out

# 1. PM2 status
print('=== PM2 STATUS ===')
r('pm2 list | grep kpma')

# 2. Recent error logs
print('=== RECENT ERROR LOGS ===')
r('pm2 logs kpma-rms --lines 15 --nostream 2>&1')

# 3. What BUILD_ID is deployed
print('=== DEPLOYED BUILD ID ===')
r('cat /home/kpma-rms/.next/BUILD_ID')

# 4. What does the HTML actually serve (check for build ID in response)
print('=== SERVED HTML CHECK ===')
r('curl -s http://localhost:3008/ | head -50')

# 5. Check if background build (rebuild2) is still running or finished
print('=== BACKGROUND BUILD STATUS ===')
r('ps aux | grep rebuild2 | grep -v grep')
r('tail -5 /tmp/rebuild2.log')

# 6. Check .next/static contents match BUILD_ID
print('=== STATIC FILES CHECK ===')
BID = r('cat /home/kpma-rms/.next/BUILD_ID').strip()
print(f'Build ID: {BID}')

ssh.close()
