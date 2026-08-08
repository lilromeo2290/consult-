import paramiko, time, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=20)

# Check .env in base dir
si, so, se = ssh.exec_command('cat /home/consult-rms/.env')
print('BASE .env:', so.read().decode().strip())

# Test API
si, so, se = ssh.exec_command('curl -s http://localhost:3001/api/rms-data?key=rms-rate-overrides')
resp = so.read().decode().strip()
print('API status: OK' if '"data":' in resp else 'API FAILED')
print('Entries:', resp.count('amount'))

# Check for fresh errors
si, so, se = ssh.exec_command('tail -5 /root/.pm2/logs/consult-rms-error.log 2>/dev/null')
err = so.read().decode().strip()
print('Recent errors:', err[:300] if err and 'DATABASE_URL' in err else 'None (clean)')

ssh.close()
print('Done!')
