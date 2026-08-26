import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)

def r(c, t=15):
    i,o,e=ssh.exec_command(c,timeout=t)
    out=o.read().decode(); err=e.read().decode()
    print(f'>>> {c}'); print(out[-3000:] if out.strip() else ''); print(err[-1000:] if err.strip() else ''); print('---'); return out

# Check if there's a service worker in the public dir
print('=== SERVICE WORKER CHECK ===')
r('ls /home/kpma-rms/public/sw* /home/kpma-rms/public/service-worker* 2>/dev/null || echo "NO SW FILES"')

# Check for next.config.ts output settings
print('=== NEXT CONFIG ===')
r('cat /home/kpma-rms-build/next.config.ts')

# Check the new build chunks
print('=== NEW BUILD CHUNKS ===')
r('ls /home/kpma-rms/.next/static/chunks/')

# Compare chunk sizes between old and new build
print('=== CHUNK SIZE COMPARISON ===')
r('wc -c /home/kpma-rms/.next/static/chunks/*.js | sort -n | tail -10')

# Check if there are any .map files that might be relevant
print('=== CHECK FOR SOURCE MAPS ===')
r('ls /home/kpma-rms/.next/static/chunks/*.map 2>/dev/null || echo NO_MAPS')

# Download the main app chunk to check for TDZ patterns
print('=== CHECK MAIN CHUNK FOR TDZ PATTERNS ===')
r('grep -o "let h\|const h\|var h\|class h" /home/kpma-rms/.next/static/chunks/*.js | head -20')

# Check the turbopack runtime chunk
print('=== TURBOPACK RUNTIME ===')
BID = r('cat /home/kpma-rms/.next/BUILD_ID').strip()(f'ls /home/kpma-rms/.next/static/chunks/turbopack*')

ssh.close()