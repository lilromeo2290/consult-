import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)

def r(c, t=15):
    i,o,e=ssh.exec_command(c,timeout=t)
    out=o.read().decode(); err=e.read().decode()
    print(f'>>> {c}'); print(out[-3000:] if out.strip() else ''); print(err[-1000:] if err.strip() else ''); print('---'); return out

# Check the main JS chunk for TDZ patterns
print('=== CHECK MAIN CHUNK FOR TDZ ===')
r('head -c 500 /home/kpma-rms/.next/static/chunks/93bdb13f9d6d49e3.js')

# Check required-server-files
print('=== REQUIRED SERVER FILES ===')
r('cat /home/kpma-rms/.next/required-server-files.json | python3 -m json.tool 2>/dev/null | head -30')

# Check the routes-manifest
print('=== ROUTES MANIFEST ===')
r('cat /home/kpma-rms/.next/routes-manifest.json | python3 -m json.tool 2>/dev/null | head -30')

# Deploy the new build (rebuild2 - minimal BP Payment removal)
print('=== DEPLOYING NEW BUILD (minimal BP removal) ===')
r('pm2 stop kpma-rms 2>/dev/null; pm2 delete kpma-rms 2>/dev/null')
r('rm -rf /home/kpma-rms/* /home/kpma-rms/.* 2>/dev/null')

# Use the rebuild2 build output
BID = r('cat /home/kpma-rms-build/.next/BUILD_ID').strip()
print(f'New Build ID: {BID}')

r(f'cp -a /home/kpma-rms-build/.next/standalone/. /home/kpma-rms/')
r('cat /home/kpma-rms/.next/BUILD_ID')
r(f'cp -r /home/kpma-rms-build/.next/static /home/kpma-rms/.next/static')
r('cp -r /home/kpma-rms-build/public /home/kpma-rms/public')

# Fix .env
r('echo "DATABASE_URL=file:/home/z/my-project/db/custom.db" > /home/kpma-rms/.env')

# Start
r('cd /home/kpma-rms && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms')
time.sleep(5)

# Check
r('pm2 list | grep kpma')
r('pm2 logs kpma-rms --lines 5 --nostream 2>&1')
r('curl -s -o /dev/null -w "%{http_code}" http://localhost:3008/')

# Check what chunks the new HTML references
print('=== NEW HTML CHUNKS ===')
r('curl -s http://localhost:3008/ | grep -o "chunks/[^"]*" | sort -u')

ssh.close()