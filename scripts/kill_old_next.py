import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Delete the old .next at app root
print('Deleting old .next at app root...')
stdin, stdout, stderr = ssh.exec_command('rm -rf ' + APP + '/.next 2>&1')
print(stdout.read().decode(), stderr.read().decode())

# Verify it's gone
stdin, stdout, stderr = ssh.exec_command('ls ' + APP + '/.next 2>&1')
print('Verify:', stdout.read().decode().strip())

# Restart PM2
stdin, stdout, stderr = ssh.exec_command('pm2 restart consult-rms 2>&1 | tail -3')
print('PM2:', stdout.read().decode().strip())

# Verify app serves correct chunks now
import time
time.sleep(3)
stdin, stdout, stderr = ssh.exec_command('curl -s http://127.0.0.1:3001/ 2>/dev/null | grep -o "d66fbf[^"]*" | head -3')
print('Chunk refs:', stdout.read().decode().strip())

ssh.close()
print('Done!')