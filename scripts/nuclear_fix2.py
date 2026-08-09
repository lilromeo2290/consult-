import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# 1. PM2 status and recent error logs
print('=== PM2 ===')
stdin, stdout, stderr = ssh.exec_command('pm2 status 2>&1')
print(stdout.read().decode())

print('=== Recent errors ===')
stdin, stdout, stderr = ssh.exec_command('pm2 logs consult-rms --lines 15 --nostream --err 2>&1')
print(stdout.read().decode()[:2000])

# 2. Check if port 3001 is listening
print('=== Port 3001 ===')
stdin, stdout, stderr = ssh.exec_command('ss -tlnp | grep 3001')
print(stdout.read().decode().strip() or 'NOT LISTENING')

# 3. Try curl with more output
print('=== Curl test ===')
stdin, stdout, stderr = ssh.exec_command('curl -sI http://127.0.0.1:3001/ 2>&1 | head -10')
print(stdout.read().decode().strip())

# 4. Check the nginx RMS config for caching headers
print('=== RMS nginx config ===')
stdin, stdout, stderr = ssh.exec_command('cat /etc/nginx/conf.d/consult-rms.conf')
print(stdout.read().decode())

# 5. Check rms.clipeconsult.com config
print('=== rms.clipeconsult.com config ===')
stdin, stdout, stderr = ssh.exec_command('cat /etc/nginx/conf.d/rms.clipeconsult.com.conf')
print(stdout.read().decode())

ssh.close()