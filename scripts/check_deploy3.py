import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Check server.js exists
stdin, stdout, stderr = ssh.exec_command(f'ls -la {REMOTE_APP}/server.js 2>&1')
print("server.js:", stdout.read().decode().strip())

# Check client-side chunks for the property code
stdin, stdout, stderr = ssh.exec_command(f'grep -rl "propRevenueCodeRef" {REMOTE_APP}/standalone/.next/ 2>&1 | head -5')
print("propRevenueCodeRef in .next:", stdout.read().decode().strip())

# Check for PROPERTY_REVENUE in all .next
stdin, stdout, stderr = ssh.exec_command(f'grep -rl "PROPERTY_REVENUE" {REMOTE_APP}/standalone/.next/ 2>&1 | head -5')
print("PROPERTY_REVENUE in .next:", stdout.read().decode().strip())

# Check for propRevenueDescRef
stdin, stdout, stderr = ssh.exec_command(f'grep -rl "propRevenueDescRef" {REMOTE_APP}/standalone/.next/ 2>&1 | head -5')
print("propRevenueDescRef in .next:", stdout.read().decode().strip())

# Check client chunks for 1413001
stdin, stdout, stderr = ssh.exec_command(f'grep -rl "1413001" {REMOTE_APP}/standalone/.next/static/ 2>&1 | head -5')
print("1413001 in static:", stdout.read().decode().strip())

# Check if the old property component is cached
stdin, stdout, stderr = ssh.exec_command(f'grep -c "propRevenueCodeRef" {REMOTE_APP}/standalone/.next/static/chunks/*.js 2>/dev/null | grep -v ":0$" | head -5')
print("propRevenueCodeRef count in chunks:", stdout.read().decode().strip())

ssh.close()
