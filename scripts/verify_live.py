import paramiko, time

HOST = '153.75.247.4'
USER = 'root'
PASS = 'Do1_BuZe4_M1-V6v1_S4'
APP = '/home/consult-rms'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Wait for app to start
time.sleep(5)

# Check if app is responding
stdin, stdout, stderr = ssh.exec_command('curl -sI http://127.0.0.1:3001/ 2>&1 | head -5')
print('App response:', stdout.read().decode().strip())

# Check the HTML for chunk references
stdin, stdout, stderr = ssh.exec_command('curl -s http://127.0.0.1:3001/ 2>/dev/null | grep -oP "/_next/static/[^"]*" | sort -u | head -20')
print('Static refs:', stdout.read().decode().strip())

# Check if 4809 chunk still accessible
stdin, stdout, stderr = ssh.exec_command('curl -sI http://127.0.0.1:3001/_next/static/chunks/4809a29512842e12.js 2>&1 | head -3')
print('Old chunk:', stdout.read().decode().strip())

# Check if d66fbf chunk accessible
stdin, stdout, stderr = ssh.exec_command('curl -sI http://127.0.0.1:3001/_next/static/chunks/d66fbf52278f2419.js 2>&1 | head -3')
print('New chunk:', stdout.read().decode().strip())

# Check for old .next directory
stdin, stdout, stderr = ssh.exec_command('ls -d ' + APP + '/.next 2>&1')
print('Old .next exists:', stdout.read().decode().strip())

ssh.close()
