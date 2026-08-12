import paramiko
import time

time.sleep(5)  # Wait for kpma-rms to fully start

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4')

print('>>> kpma-rms status:')
stdin, stdout, stderr = ssh.exec_command('pm2 show kpma-rms | grep -E "status|uptime|exec cwd|script path"')
print(stdout.read().decode().strip())

print()
print('>>> Testing https://kpma.clipeconsult.com ...')
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "HTTP %{http_code} | SSL %{ssl_verify_result}" https://kpma.clipeconsult.com')
print(stdout.read().decode().strip())

print()
print('>>> Testing http://kpma.clipeconsult.com (should redirect to https) ...')
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "HTTP %{http_code} | Redirect: %{redirect_url}" -L --max-redirs 0 http://kpma.clipeconsult.com 2>&1 || true')
print(stdout.read().decode().strip())

ssh.close()
