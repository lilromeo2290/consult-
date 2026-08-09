import paramiko, os

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

chunk = REMOTE_APP + '/standalone/.next/static/chunks/80e8dda786764279.js'

# Check file size and modification time
stdin, stdout, stderr = ssh.exec_command('ls -la ' + chunk + ' 2>&1')
print("Remote file:", stdout.read().decode().strip())

# Check local file
local_chunk = '/home/z/my-project/.next/static/chunks/80e8dda786764279.js'
if os.path.exists(local_chunk):
    print("Local file size:", os.path.getsize(local_chunk))

# Check local count
stdin, stdout, stderr = ssh.exec_command('grep -c "Property Revenue Code" /home/z/my-project/.next/static/chunks/80e8dda786764279.js 2>&1')
print("Local Property Revenue Code:", stdout.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command('grep -c "Type to search code" /home/z/my-project/.next/static/chunks/80e8dda786764279.js 2>&1')
print("Local Type to search code:", stdout.read().decode().strip())

# Get remote file size via SFTP
sftp = ssh.open_sftp()
try:
    remote_stat = sftp.stat(chunk)
    print("Remote file size (SFTP):", remote_stat.st_size)
except:
    print("Remote file not accessible via SFTP")

# List ALL js chunks on remote
stdin, stdout, stderr = ssh.exec_command('ls -la ' + REMOTE_APP + '/standalone/.next/static/chunks/*.js 2>&1')
print("\nRemote chunks:")
print(stdout.read().decode().strip()[:1000])

# List ALL js chunks locally
print("\nLocal chunks:")
local_chunks = os.listdir('/home/z/my-project/.next/static/chunks/')
for c in sorted(local_chunks):
    if c.endswith('.js'):
        print(f"  {c} ({os.path.getsize('/home/z/my-project/.next/static/chunks/' + c)})")

sftp.close()
ssh.close()