import paramiko

HOST, USER, PASS = '153.75.247.4', 'root', 'Do1_BuZe4_M1-V6v1_S4'

def ssh_cmd(ssh, cmd):
    si, so, se = ssh.exec_command(cmd, timeout=30)
    out = so.read().decode().strip()
    err = se.read().decode().strip()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=20)

# 1. Check the Prisma engine binary
print('=== Prisma engine binary ===')
out, err = ssh_cmd(ssh, 'ls -la /home/consult-rms/.next/standalone/node_modules/.prisma/client/*.so 2>/dev/null; ls -la /home/consult-rms/.next/standalone/node_modules/.prisma/client/libquery_engine* 2>/dev/null; file /home/consult-rms/.next/standalone/node_modules/.prisma/client/libquery_engine* 2>/dev/null')
print(f'Engine: {out}')

# 2. Check OS arch
print('\n=== OS info ===')
out, err = ssh_cmd(ssh, 'uname -a && cat /etc/os-release | head -4')
print(f'OS: {out}')

# 3. Test the engine binary directly
print('\n=== Test engine binary ===')
out, err = ssh_cmd(ssh, '/home/consult-rms/.next/standalone/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node --help 2>&1 | head -5 || echo "FAILED TO RUN"')
print(f'Engine test: {out}')
if err: print(f'Engine stderr: {err[:500]}')

# 4. Check the actual Node.js server process output right after curl
print('\n=== Curl with verbose ===')
out, err = ssh_cmd(ssh, '''curl -sv 'http://localhost:3001/api/rms-data?key=rms-businesses' 2>&1''')
print(f'Curl: {out[-1000:]}')

# 5. Check node version
print('\n=== Node version ===')
out, err = ssh_cmd(ssh, 'node --version')
print(f'Node: {out}')

# 6. Directly test prisma from node
print('\n=== Direct Prisma test ===')
out, err = ssh_cmd(ssh, '''cd /home/consult-rms/.next/standalone && node -e "
const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();
p.rmsData.findUnique({where:{key:'rms-businesses'}}).then(r => {console.log('OK:', r ? r.key : 'null'); p.\$disconnect();}).catch(e => {console.error('ERR:', e.message); p.\$disconnect();});
" 2>&1''')
print(f'Direct test: {out}')
if err: print(f'Direct stderr: {err[:500]}')

ssh.close()
print('\nDone.')
