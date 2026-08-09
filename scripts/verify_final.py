import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# PM2 status
stdin, stdout, stderr = ssh.exec_command('pm2 status consult-rms 2>&1')
print("PM2:", stdout.read().decode().strip())

# Only ONE chunk should have property revenue code
stdin, stdout, stderr = ssh.exec_command('grep -rl "Property Revenue Code" ' + APP + '/standalone/.next/static/chunks/ 2>/dev/null')
print("Property Revenue Code in:", stdout.read().decode().strip())

# Verify old chunks are gone
stdin, stdout, stderr = ssh.exec_command('ls ' + APP + '/standalone/.next/static/chunks/80e8dda786764279.js ' + APP + '/standalone/.next/static/chunks/c4d780dd715b83a3.js 2>&1')
print("Old chunks:", stdout.read().decode().strip())

# Verify the default values in the new chunk
stdin, stdout, stderr = ssh.exec_command('grep -o ".{0,30}1413001.{0,50}" ' + APP + '/standalone/.next/static/chunks/d66fbf52278f2419.js 2>/dev/null | head -3')
print("1413001 context:", stdout.read().decode().strip())

# Verify Property Rate default
stdin, stdout, stderr = ssh.exec_command('grep -o ".{0,30}Property Rate.{0,50}" ' + APP + '/standalone/.next/static/chunks/d66fbf52278f2419.js 2>/dev/null | head -5')
print("Property Rate context:", stdout.read().decode().strip())

ssh.close()