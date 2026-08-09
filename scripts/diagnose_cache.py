import paramiko, json

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# 1. Check what chunks the build manifest references
print('=== Build manifest ===')
stdin, stdout, stderr = ssh.exec_command('cat ' + APP + '/standalone/.next/build-manifest.json 2>&1')
manifest = json.loads(stdout.read().decode())
for k, v in manifest.get('staticChunks', {}).items():
    if 'd66fbf' in str(v) or '80e8dda' in str(v) or 'c4d780' in str(v):
        print(f'  {k}: {v}')

# Show all chunk references
chunks_refs = []
for k, v in manifest.get('staticChunks', {}).items():
    if 'chunks/' in k:
        chunks_refs.append(k)
print(f'Total static chunk refs in manifest: {len(chunks_refs)}')
for c in sorted(chunks_refs):
    print(f'  {c}')

# 2. Check nginx config for caching
print('\n=== Nginx config ===')
stdin, stdout, stderr = ssh.exec_command('cat /etc/nginx/conf.d/*.conf 2>/dev/null || cat /etc/nginx/sites-enabled/* 2>/dev/null || echo NO_CONFIG')
print(stdout.read().decode()[:2000])

# 3. Check what HTML is returned
print('\n=== HTML chunk references ===')
stdin, stdout, stderr = ssh.exec_command('grep -o "/_next/static/chunks/[^"]*" ' + APP + '/standalone/.next/server/app/index.html 2>/dev/null | head -20')
print('index.html refs:', stdout.read().decode().strip())

# 4. Check the RSC payload
stdin, stdout, stderr = ssh.exec_command('grep -o "chunks/[^"]*" ' + APP + '/standalone/.next/server/app/index.rsc 2>/dev/null | sort -u | head -20')
print('RSC refs:', stdout.read().decode().strip())

# 5. Check all HTML files for chunk references
stdin, stdout, stderr = ssh.exec_command('grep -rl "80e8dda\|c4d780\|d66fbf" ' + APP + '/standalone/.next/server/ 2>/dev/null')
print('Server files with old/new chunks:', stdout.read().decode().strip())

ssh.close()
