import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Check compiled chunks for property revenue codes
stdin, stdout, stderr = ssh.exec_command(f'grep -rl "PROPERTY_REVENUE_CODES" {REMOTE_APP}/standalone/.next/server/ 2>&1 | head -5')
print("CHUNK FILES:", stdout.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command(f'grep -rl "1413001" {REMOTE_APP}/standalone/.next/server/ 2>&1 | head -5')
print("1413001 FILES:", stdout.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command(f'grep -rl "Property Rate" {REMOTE_APP}/standalone/.next/server/ 2>&1 | head -5')
print("Property Rate FILES:", stdout.read().decode().strip())

# Check the properties component chunk
stdin, stdout, stderr = ssh.exec_command(f'grep -rl "propRevenueCodeRef" {REMOTE_APP}/standalone/.next/server/ 2>&1 | head -5')
print("propRevenueCodeRef FILES:", stdout.read().decode().strip())

# Check PM2 logs for errors
stdin, stdout, stderr = ssh.exec_command(f'pm2 logs consult-rms --lines 20 --nostream 2>&1')
print("PM2 LOGS:", stdout.read().decode().strip()[:2000])

ssh.close()
