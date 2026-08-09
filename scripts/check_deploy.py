import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Check if the file exists in standalone
stdin, stdout, stderr = ssh.exec_command(f'ls -la {REMOTE_APP}/standalone/src/lib/property-revenue-codes.ts 2>&1')
print("FILE CHECK:", stdout.read().decode().strip())

# Check the .next/server chunks for the property component
stdin, stdout, stderr = ssh.exec_command(f'rg -l "PROPERTY_REVENUE_CODES" {REMOTE_APP}/standalone/ 2>&1 | head -5')
print("CHUNK FILES:", stdout.read().decode().strip())

# Check if property component references it
stdin, stdout, stderr = ssh.exec_command(f'rg "PROPERTY_REVENUE_CODES" {REMOTE_APP}/standalone/.next/server/ 2>&1 | head -3')
print("SERVER REF:", stdout.read().decode().strip())

ssh.close()
