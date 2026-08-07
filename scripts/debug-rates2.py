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

# 1. Check the full PM2 out log (more lines)
print('=== PM2 out log (last 50) ===')
out, err = ssh_cmd(ssh, 'tail -50 /root/.pm2/logs/consult-rms-out.log 2>/dev/null')
print(out[-2000:] if out else '(empty)')

# 2. Check full error log
print('\n=== PM2 error log (last 50) ===')
out, err = ssh_cmd(ssh, 'tail -50 /root/.pm2/logs/consult-rms-error.log 2>/dev/null')
print(out[-2000:] if out else '(empty)')

# 3. Check if prisma is in the standalone build
print('\n=== Prisma in standalone ===')
out, err = ssh_cmd(ssh, 'ls /home/consult-rms/.next/standalone/node_modules/.prisma/ 2>/dev/null || echo "NO .prisma dir"')
print(f'Prisma client: {out}')
out, err = ssh_cmd(ssh, 'ls /home/consult-rms/.next/standalone/node_modules/@prisma/ 2>/dev/null || echo "NO @prisma dir"')
print(f'@prisma: {out}')

# 4. Check .env file
print('\n=== .env file ===')
out, err = ssh_cmd(ssh, 'cat /home/consult-rms/.next/standalone/.env')
print(f'ENV: {out}')

# 5. Check the db.ts file in the build to see DATABASE_URL resolution
print('\n=== db module in build ===')
out, err = ssh_cmd(ssh, 'grep -r "DATABASE_URL" /home/consult-rms/.next/standalone/node_modules/.prisma/ 2>/dev/null | head -5')
print(f'DB URL refs: {out}')

# 6. Check if the error log has Prisma errors
print('\n=== Prisma errors in log ===')
out, err = ssh_cmd(ssh, '''grep -i "prisma\|database\|sqlite" /root/.pm2/logs/consult-rms-error.log 2>/dev/null | tail -10''')
print(f'Prisma errors: {out if out else "(none)"}')

# 7. Check if node_modules has prisma in the right place
print('\n=== prisma client location ===')
out, err = ssh_cmd(ssh, 'find /home/consult-rms/.next/standalone/node_modules -name "index.js" -path "*prisma*" 2>/dev/null')
print(f'Prisma index files: {out}')

# 8. Test a simple API call that worked before (businesses)
print('\n=== Test businesses API ===')
out, err = ssh_cmd(ssh, '''curl -s "http://localhost:3001/api/rms-data?key=rms-businesses" | head -c 200''')
print(f'Businesses: {out}')

ssh.close()
print('\nDone.')