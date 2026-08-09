import paramiko, re

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Check what chunk hashes are in the server files
print('=== Chunk hashes in server files ===')
for fname in ['index.html', 'index.rsc', 'page_client-reference-manifest.js']:
    path = APP + '/standalone/.next/server/app/' + fname
    stdin, stdout, stderr = ssh.exec_command('grep -oP "d66fbf[^"]*|80e8dda[^"]*|c4d780[^"]*" ' + path + ' 2>/dev/null | sort -u')
    hashes = stdout.read().decode().strip()
    print(f'{fname}: {hashes}')

# Check segments
print('\n=== Segment files chunk refs ===')
stdin, stdout, stderr = ssh.exec_command('grep -oP "d66fbf[^"]*|80e8dda[^"]*|c4d780[^"]*" ' + APP + '/standalone/.next/server/app/index.segments/*.rsc 2>/dev/null | sort -u')
print(stdout.read().decode().strip())

# The REAL fix: sed-replace old chunk refs with new in ALL server files
print('\n=== Replacing old chunk refs in server files ===')
old_hashes = ['80e8dda786764279', 'c4d780dd715b83a3']
new_hash = 'd66fbf52278f2419'

for old in old_hashes:
    # Replace in all files under .next/server/
    cmd = f"find {APP}/standalone/.next/server/ -type f -exec sed -i 's/{old}/{new_hash}/g' {{}} + 2>&1"
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    err = stderr.read().decode().strip()
    if err:
        print(f'  sed {old}->{new_hash}: {err[:200]}')
    else:
        print(f'  Replaced {old} -> {new_hash}')

# Also check build-manifest.json
print('\n=== Build manifest check ===')
stdin, stdout, stderr = ssh.exec_command('cat ' + APP + '/standalone/.next/build-manifest.json 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps({k:v for k,v in d.items()}, indent=2)[:1000])"')
print(stdout.read().decode().strip())

# Check _buildManifest.js
stdin, stdout, stderr = ssh.exec_command('find ' + APP + '/standalone/.next/ -name "_buildManifest*" -type f 2>/dev/null')
print('Build manifest files:', stdout.read().decode().strip())

# Restart
stdin, stdout, stderr = ssh.exec_command('pm2 restart consult-rms 2>&1 | grep consult')
print('Restart:', stdout.read().decode().strip())

ssh.close()
print('Done!')
