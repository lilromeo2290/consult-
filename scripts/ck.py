import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('153.75.247.4', username='root', password='Do1_BuZe4_M1-V6v1_S4', timeout=10)
def r(c):
    i,o,e=ssh.exec_command(c,timeout=10)
    print(f">>> {c}")
    print(o.read().decode()[-1500:])
    print(e.read().decode()[-500:] if e.read().decode().strip() else '')
r('echo "Deploy:" && cat /home/kpma-rms/.next/BUILD_ID')
r('echo "Build:" && cat /home/kpma-rms-build/.next/BUILD_ID')
r('ls /home/kpma-rms/.next/static/')
r('ls /home/kpma-rms/.next/static/build-*/_buildManifest.js 2>/dev/null || echo NO_MANIFEST')
ssh.close()