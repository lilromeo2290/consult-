import paramiko
ssh=paramiko.SSHClient();ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy());ssh.connect('153.75.247.4',username='root',password='Do1_BuZe4_M1-V6v1_S4',timeout=10)
def r(c,t=120):
 i,o,e=ssh.exec_command(c,timeout=t);out=o.read().decode();err=e.read().decode();print(f'>>> {c}');print(out[-2000:] if out.strip() else '');print(err[-500:] if err.strip() else '');print('---');return out
r('pm2 stop kpma-rms 2>/dev/null;pm2 delete kpma-rms 2>/dev/null')
r('rm -rf /home/kpma-rms-build-fresh')
r('cd /home && git clone --depth 5 https://github.com/lilromeo2290/consult-.git kpma-rms-build-fresh 2>&1')
r('cd /home/kpma-rms-build-fresh && git checkout 14b4ee6 2>&1')
ssh.close()
print('Clone done. Next: run npm install manually')
