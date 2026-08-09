import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)
sftp = ssh.open_sftp()

# 1. Check what chunk files exist NOW
print("=== Current chunks on server ===")
stdin, stdout, stderr = ssh.exec_command('ls -la ' + APP + '/standalone/.next/static/chunks/*.js 2>&1')
print(stdout.read().decode())

# 2. Check which chunk has Property Revenue Code
print("=== Searching for 'Property Revenue Code' ===")
stdin, stdout, stderr = ssh.exec_command('grep -rl "Property Revenue Code" ' + APP + '/standalone/.next/ 2>/dev/null')
print(stdout.read().decode())

# 3. Check for '1413001'
print("=== Searching for '1413001' ===")
stdin, stdout, stderr = ssh.exec_command('grep -rl "1413001" ' + APP + '/standalone/.next/static/ 2>/dev/null')
print(stdout.read().decode())

# 4. Check the build manifest for chunk references
print("=== Build manifest chunk list ===")
stdin, stdout, stderr = ssh.exec_command('cat ' + APP + '/standalone/.next/build-manifest.json 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); [print(k,v) for k,v in d.get(\"staticChunks\",{}).items() if \"chunks/\" in k][:20]"')
print(stdout.read().decode()[:1500])

# 5. Check _buildManifest.js
print("=== _buildManifest.js content (first 2000 chars) ===")
stdin, stdout, stderr = ssh.exec_command('cat ' + APP + '/standalone/.next/static/*/js/_buildManifest.js 2>/dev/null | head -c 2000')
print(stdout.read().decode())

sftp.close()
ssh.close()
