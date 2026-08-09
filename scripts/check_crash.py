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
print(stdout.read().decode())

# Error logs
stdin, stdout, stderr = ssh.exec_command('pm2 logs consult-rms --lines 20 --nostream --err 2>&1')
print('Errors:')
print(stdout.read().decode()[:2000])

# Check server.js location
stdin, stdout, stderr = ssh.exec_command('ls -la ' + APP + '/server.js ' + APP + '/standalone/server.js 2>&1')
print('server.js:', stdout.read().decode().strip())

# Check what .next the standalone server expects
stdin, stdout, stderr = ssh.exec_command('head -30 ' + APP + '/server.js 2>&1')
print('server.js head:')
print(stdout.read().decode()[:500])

# Check PM2 cwd
stdin, stdout, stderr = ssh.exec_command('pm2 show consult-rms 2>&1 | grep -i "cwd\|script"')
print('PM2 cwd:', stdout.read().decode().strip())

ssh.close()