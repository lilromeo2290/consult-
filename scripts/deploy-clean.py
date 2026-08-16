#!/usr/bin/env python3
"""Clean deploy: stop PM2, clear, upload, extract, fix, restart."""
import paramiko, os, time

VPS = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'
DDIR = '/home/kpma-rms'

def run(c, cmd, timeout=120):
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out, err

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS, port=22, username=VPS_USER, password=VPS_PASS, timeout=15)
    print('SSH OK')

    # Stop PM2
    print('Stopping PM2...')
    run(client, 'pm2 stop kpma-rms')
    time.sleep(2)

    # Clear
    print('Clearing deploy dir...')
    run(client, f'rm -rf {DDIR}/* {DDIR}/.[!.]* 2>/dev/null; true')

    sftp = client.open_sftp()

    # Upload & extract standalone
    print('Uploading standalone...')
    sftp.put('/tmp/standalone.tar.gz', '/tmp/standalone.tar.gz')
    print('Extracting standalone...')
    run(client, f'cd {DDIR} && tar xzf /tmp/standalone.tar.gz', timeout=120)

    # Verify node_modules
    out, _ = run(client, f'ls {DDIR}/node_modules/ 2>&1')
    print(f'node_modules ({len(out.split())} items): {out[:200].strip()}')

    # Check if react exists (may be symlink)
    out, _ = run(client, f'ls -la {DDIR}/node_modules/react 2>&1 | head -1')
    print(f'react: {out.strip()}')

    # Upload & extract static
    print('Uploading static...')
    sftp.put('/tmp/static.tar.gz', '/tmp/static.tar.gz')
    run(client, f'mkdir -p {DDIR}/.next/static && cd {DDIR}/.next/static && tar xzf /tmp/static.tar.gz')

    # Upload & extract public
    print('Uploading public...')
    sftp.put('/tmp/public.tar.gz', '/tmp/public.tar.gz')
    run(client, f'cd {DDIR} && tar xzf /tmp/public.tar.gz')

    # Fix .env
    run(client, f'echo "file:/home/kpma-rms-build-fresh/db/custom.db" > {DDIR}/.env')

    # Fix Prisma client hash symlink
    print('Fixing Prisma client symlink...')
    out, _ = run(client, f'grep -roh "@prisma/client-[a-f0-9]" {DDIR}/.next/server/ 2>/dev/null | sort -u | head -1')
    if out.strip():
        hashed = out.strip()
        run(client, f'ln -sf {DDIR}/node_modules/@prisma/client {DDIR}/node_modules/{hashed}')
        print(f'  Symlinked {hashed} -> @prisma/client')

    # Restart PM2
    print('Starting PM2...')
    run(client, 'pm2 delete kpma-rms 2>/dev/null; true')
    time.sleep(1)
    run(client, f'cd {DDIR} && PORT=3008 DATABASE_URL="file:/home/kpma-rms-build-fresh/db/custom.db" pm2 start server.js --name kpma-rms')
    run(client, 'pm2 save')
    time.sleep(5)

    # Health check
    out, _ = run(client, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3008/')
    print(f'HTTP status: {out.strip()}')

    out, _ = run(client, 'pm2 logs kpma-rms --lines 5 --nostream 2>&1')
    print(f'Logs: {out[-500:]}')

    # Cleanup
    run(client, 'rm -f /tmp/standalone.tar.gz /tmp/static.tar.gz /tmp/public.tar.gz')
    sftp.close()
    client.close()
    print('DEPLOY COMPLETE')

if __name__ == '__main__':
    main()
