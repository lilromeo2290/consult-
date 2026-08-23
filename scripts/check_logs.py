#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

print('=== Recent PM2 logs ===')
stdin, stdout, stderr = ssh.exec_command('pm2 logs kpma-rms --lines 50 --nostream 2>&1')
print(stdout.read().decode())

ssh.close()
