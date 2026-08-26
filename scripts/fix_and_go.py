import paramiko
import time

ssh=paramiko.SSHClient();ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy());ssh.connect('153.75.247.4',username='root',password='Do1_BuZe4_M1-V6v1_S4',timeout=10)

def r(c,t=30):
 i,o,e=ssh.exec_command(c,timeout=t);out=o.read().decode();err=e.read().decode();print(f'>>> {c}');print(out[-2000:] if out.strip() else '');print(err[-500:] if err.strip() else '');print('---');return out

# Check what's in the dir
r('ls /home/rms-correct/src/components/rms/rms-layout.tsx 2>/dev/null && echo OK || echo MISSING')
r('ls /home/rms-correct/package.json 2>/dev/null && echo OK || echo MISSING')
r('ls /home/rms-correct/prisma/schema.prisma 2>/dev/null && echo OK || echo MISSING')

# Check build log
r('tail -5 /tmp/correct-deploy.log 2>/dev/null || echo NO_LOG')

# If files missing, remove and re-clone
r('ls /home/rms-correct/src/app/page.tsx 2>/dev/null || (rm -rf /home/rms-correct && echo NEED_RECLONE)')

ssh.close()