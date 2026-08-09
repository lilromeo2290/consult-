import paramiko

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
REMOTE_APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

chunk = REMOTE_APP + '/standalone/.next/static/chunks/80e8dda786764279.js'

# Check for the dropdown code in the deployed chunk
stdin, stdout, stderr = ssh.exec_command('grep -c "Property Revenue Code" ' + chunk + ' 2>&1')
print("Property Revenue Code label count:", stdout.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command('grep -c "Type to search code" ' + chunk + ' 2>&1')
print("Type to search code count:", stdout.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command('grep -c "Property Rate" ' + chunk + ' 2>&1')
print("Property Rate count:", stdout.read().decode().strip())

# Check error logs
stdin, stdout, stderr = ssh.exec_command('pm2 logs consult-rms --lines 5 --nostream --err 2>&1')
print("Recent errors:", stdout.read().decode().strip()[:500])

ssh.close()