import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=15)

sftp = ssh.open_sftp()
sftp.put('/home/z/my-project/scripts/check_vps_data2.js', '/tmp/check_data2.js')
sftp.close()

stdin, stdout, stderr = ssh.exec_command('cd /home/kpma-rms && node /tmp/check_data2.js', timeout=30)
print(stdout.read().decode())
err = stderr.read().decode()
if err: print('STDERR:', err[:500])

ssh.close()
