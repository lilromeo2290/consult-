import paramiko

VPS_HOST = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)

sftp = ssh.open_sftp()
sftp.put('/home/z/my-project/scripts/vps_check_biz_data.py', '/tmp/check_biz_data.py')
sftp.close()

stdin, stdout, stderr = ssh.exec_command('python3 /tmp/check_biz_data.py')
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print('ERROR:', err)

ssh.close()
