import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=20)

# Check .env file
si, so, se = ssh.exec_command('cat /home/consult-rms/.next/standalone/.env')
print('=== .env ===')
print(so.read().decode().strip())

# Check if Prisma client exists
si, so, se = ssh.exec_command('ls -la /home/consult-rms/.next/standalone/node_modules/.prisma/client/ 2>/dev/null | head -5')
print('=== Prisma files ===')
print(so.read().decode().strip())

# Check PM2 error log
si, so, se = ssh.exec_command('tail -20 /root/.pm2/logs/consult-rms-error.log 2>/dev/null')
print('=== Error log ===')
print(so.read().decode().strip()[:1000])

# Check PM2 out log
si, so, se = ssh.exec_command('tail -10 /root/.pm2/logs/consult-rms-out.log 2>/dev/null')
print('=== Out log ===')
print(so.read().decode().strip()[:500])

# Check working directory and env
si, so, se = ssh.exec_command('pm2 consult-rms 2>/dev/null; pm2 show consult-rms 2>/dev/null | head -30')
print('=== PM2 show ===')
print(so.read().decode().strip()[:1000])

# Try direct API call with verbose
si, so, se = ssh.exec_command('curl -v http://localhost:3001/api/rms-data?key=rms-rate-overrides 2>&1 | tail -20')
print('=== Curl verbose ===')
print(so.read().decode().strip()[:1000])

ssh.close()
