import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

# Step 1: Stop and delete consult-rms PM2 process (frees ~115MB RAM)
print('>>> Stopping and deleting consult-rms PM2 process...')
stdin, stdout, stderr = ssh.exec_command('pm2 delete consult-rms')
print(stdout.read().decode().strip())
err = stderr.read().decode().strip()
if err:
    print(f'STDERR: {err}')
print()

# Step 2: Remove /home/consult-rms directory (frees 2.9GB disk)
print('>>> Removing /home/consult-rms/ directory (2.9GB)...')
stdin, stdout, stderr = ssh.exec_command('rm -rf /home/consult-rms')
print(stdout.read().decode().strip())
err = stderr.read().decode().strip()
if err:
    print(f'STDERR: {err}')
print()

# Step 3: Also fix kpma-rms cwd to point to its own directory
print('>>> Fixing kpma-rms working directory...')
stdin, stdout, stderr = ssh.exec_command('pm2 delete kpma-rms')
print(stdout.read().decode().strip())
time.sleep(1)

stdin, stdout, stderr = ssh.exec_command(
    'cd /home/kpma-rms && HOSTNAME=0.0.0.0 PORT=3008 pm2 start server.js --name kpma-rms'
)
print(stdout.read().decode().strip())
err = stderr.read().decode().strip()
if err:
    print(f'STDERR: {err}')
print()

# Step 4: Save PM2 config
print('>>> Saving PM2 process list...')
stdin, stdout, stderr = ssh.exec_command('pm2 save')
print(stdout.read().decode().strip())
print()

# Step 5: Verify
print('>>> Final PM2 list:')
stdin, stdout, stderr = ssh.exec_command('pm2 list')
print(stdout.read().decode())
print()

print('>>> Disk usage check:')
stdin, stdout, stderr = ssh.exec_command('df -h / | tail -1')
print(stdout.read().decode().strip())
print()

print('>>> Remaining RMS directories:')
stdin, stdout, stderr = ssh.exec_command('ls -la /home/ | grep -i rms; echo "Done"')
print(stdout.read().decode().strip())

ssh.close()
print()
print('Cleanup complete!')
