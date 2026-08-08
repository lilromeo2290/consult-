import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=20)

# Copy .env to base dir
si, so, se = ssh.exec_command('cp /home/consult-rms/.next/standalone/.env /home/consult-rms/.env')
print('Copy .env:', so.read().decode().strip())

# Restart PM2
si, so, se = ssh.exec_command('pm2 delete consult-rms 2>/dev/null; cd /home/consult-rms && PORT=3001 pm2 start server.js --name consult-rms')
print('Restart:', so.read().decode().strip())

import time
time.sleep(4)

# Test API
si, so, se = ssh.exec_command('curl -s http://localhost:3001/api/rms-data?key=rms-rate-overrides')
resp = so.read().decode().strip()
print('API response (first 300):', resp[:300])

ssh.close()
