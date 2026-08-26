import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)

def r(c, t=15):
    i,o,e=ssh.exec_command(c,timeout=t)
    out=o.read().decode(); err=e.read().decode()
    print(f'>>> {c}'); print(out[-3000:] if out.strip() else ''); print(err[-1000:] if err.strip() else ''); print('---'); return out

# 1. Check actual HTTP status
print('=== HTTP STATUS ===')
r('curl -s -o /dev/null -w "STATUS:%{http_code} SIZE:%{size_download}" http://localhost:3008/')

# 2. Check what static chunks exist for this build
print('=== STATIC CHUNKS ===')
r('ls /home/kpma-rms/.next/static/chunks/ | head -20')
r('ls /home/kpma-rms/.next/static/build-1786633097055/ 2>/dev/null || echo "NO BUILD DIR IN STATIC"')

# 3. Check if the chunks referenced in HTML actually exist
print('=== CHECK REFERENCED CHUNKS ===')
r('ls -la /home/kpma-rms/.next/static/chunks/ee26d15842971915.js 2>/dev/null || echo "MISSING"')
r('ls -la /home/kpma-rms/.next/static/chunks/93bdb13f9d6d49e3.js 2>/dev/null || echo "MISSING"')

# 4. Check if there are multiple build IDs in static
print('=== ALL BUILD IDS IN STATIC ===')
r('ls -d /home/kpma-rms/.next/static/build-* 2>/dev/null || echo "NONE"')

# 5. Check the build-manifest to see what it references
print('=== BUILD MANIFEST ===')
r('cat /home/kpma-rms/.next/build-manifest.json')

# 6. Check if .env DATABASE_URL is correct for VPS
print('=== ENV FILE ===')
r('cat /home/kpma-rms/.env')
r('ls -la /home/z/my-project/db/custom.db 2>/dev/null || echo "DB NOT FOUND AT LOCAL PATH"')

# 7. Check the new build (rebuild2) output
print('=== NEW BUILD (rebuild2) INFO ===')
r('cat /home/kpma-rms-build/.next/BUILD_ID')

ssh.close()
