#!/usr/bin/env python3
"""Initialize the VPS database with proper tables."""
import sys
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

VPS_HOST = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'
VPS_APP_DIR = '/home/consult-rms'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=22, username=VPS_USER, password=VPS_PASS, timeout=15)

def vps_run(cmd, t=30):
    print(f'>> {cmd}')
    i,o,e = c.exec_command(cmd, timeout=t)
    out = o.read().decode()
    err = e.read().decode()
    if out: print(out)
    if err: print(f'STDERR: {err}')
    return out, err

# 1. Remove the empty database and recreate with proper schema
print('=== Removing empty database and creating fresh one ===')
vps_run(f'rm -f {VPS_APP_DIR}/data/rms.db')

# 2. Create the tables directly via sqlite3
print('\n=== Creating database tables ===')
create_sql = """
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS RmsData (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

# Write SQL to a temp file on VPS and execute
vps_run(f"mkdir -p {VPS_APP_DIR}/data")
vps_run(f"cat > /tmp/init_rms.sql << 'SQLEOF'\n{create_sql}\nSQLEOF")
vps_run(f'sqlite3 {VPS_APP_DIR}/data/rms.db < /tmp/init_rms.sql')
vps_run(f'rm /tmp/init_rms.sql')

# 3. Verify
print('\n=== Verifying tables ===')
vps_run(f'sqlite3 {VPS_APP_DIR}/data/rms.db ".tables"')
vps_run(f'sqlite3 {VPS_APP_DIR}/data/rms.db ".schema"')
vps_run(f'ls -la {VPS_APP_DIR}/data/rms.db')

# 4. Test API
print('\n=== Testing API ===')
vps_run(f'curl -s http://127.0.0.1:3001/api/rms-data?key=rms-businesses')

# 5. Restart PM2 to clear any cached connections
print('\n=== Restarting PM2 ===')
vps_run('pm2 restart consult-rms')
import time; time.sleep(3)
vps_run(f'curl -s http://127.0.0.1:3001/api/rms-data?key=rms-businesses')

c.close()
print('\nDone. Database initialized successfully.')
