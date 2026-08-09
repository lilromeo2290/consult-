import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Check the _buildManifest.js
print('=== _buildManifest.js ===')
stdin, stdout, stderr = ssh.exec_command('cat ' + APP + '/standalone/.next/static/ACnR_R6h6bYeGrr1UjMU0/_buildManifest.js 2>&1')
content = stdout.read().decode()
# Find chunk references
import re
chunks = re.findall(r'chunks/[^"\']+', content)
for c in sorted(set(chunks)):
    print(f'  {c}')

# Check page_client-reference-manifest.js for property chunk
print('\n=== page_client-reference-manifest.js (property refs) ===')
stdin, stdout, stderr = ssh.exec_command('cat ' + APP + '/standalone/.next/server/app/page_client-reference-manifest.js 2>&1')
content = stdout.read().decode()
chunks = re.findall(r'chunks/[^"\']+', content)
for c in sorted(set(chunks)):
    if 'd66fbf' in c or '80e8dda' in c or 'c4d780' in c:
        print(f'  MATCH: {c}')
print(f'Total chunk refs: {len(set(chunks))}')

# Check the actual RSC segments for chunk loading instructions
print('\n=== RSC segment content (first 3000 chars) ===')
stdin, stdout, stderr = ssh.exec_command('head -c 3000 ' + APP + '/standalone/.next/server/app/index.segments/__PAGE__.segment.rsc 2>&1')
print(stdout.read().decode()[:2000])

# Check ALL .js files in server that reference chunks
print('\n=== All chunk hashes in server files ===')
stdin, stdout, stderr = ssh.exec_command('grep -roh "[a-f0-9]\{16\}\.js" ' + APP + '/standalone/.next/server/ 2>/dev/null | sort -u')
print(stdout.read().decode().strip())

# Check what's in the client reference manifest for the properties module
print('\n=== Client ref manifest for properties ===')
stdin, stdout, stderr = ssh.exec_command('grep -o ".\{0,100\}properties.\{0,100\}" ' + APP + '/standalone/.next/server/app/page_client-reference-manifest.js 2>/dev/null | head -5')
print(stdout.read().decode().strip())

ssh.close()