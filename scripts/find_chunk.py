import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Check if this chunk exists anywhere
print('=== Find 4809a295 ===')
stdin, stdout, stderr = ssh.exec_command('find ' + APP + ' -name "4809a295*" 2>/dev/null')
print('Files:', stdout.read().decode().strip())

# Check all JS chunks on server
print('\n=== All chunks ===')
stdin, stdout, stderr = ssh.exec_command('ls ' + APP + '/standalone/.next/static/chunks/*.js 2>/dev/null')
print(stdout.read().decode().strip())

# Check the RSC manifest for this chunk
print('\n=== RSC references ===')
stdin, stdout, stderr = ssh.exec_command('grep -r "4809a295" ' + APP + '/standalone/.next/ 2>/dev/null')
refs = stdout.read().decode().strip()
print(refs[:1000] if refs else 'NOT FOUND')

# Check client reference manifest
print('\n=== Client reference manifest ===')
stdin, stdout, stderr = ssh.exec_command('cat ' + APP + '/standalone/.next/server/app/page_client-reference-manifest.js 2>&1')
content = stdout.read().decode()
print(f'Length: {len(content)}')
# Show property-related entries
import re
for m in re.finditer(r'"[^"]*properties[^"]*"[^}]*}', content):
    print(m.group()[:200])

ssh.close()