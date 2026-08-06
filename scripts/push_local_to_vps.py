#!/usr/bin/env python3
"""Push local RMS data to VPS database."""
import sqlite3, json, sys, subprocess, tempfile, os
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')
import paramiko

VPS_HOST = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'
VPS_DB = '/home/consult-rms/data/rms.db'

# 1. Read all data from local DB
local_conn = sqlite3.connect('/home/z/my-project/db/custom.db')
local_cur = local_conn.cursor()
local_cur.execute("SELECT key, data FROM RmsData")
rows = local_cur.fetchall()
local_conn.close()
print(f'Found {len(rows)} records to push to VPS')

# 2. Connect to VPS
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=22, username=VPS_USER, password=VPS_PASS, timeout=15)
sftp = c.open_sftp()

# 3. For each record, write a SQL file and execute on VPS
for key, data in rows:
    print(f'  Pushing: {key} ({len(data)} bytes)')
    # Write SQL to temp file
    sql = f"INSERT OR REPLACE INTO RmsData (id, key, data, updatedAt) VALUES (lower(hex(randomblob(8))), '{key.replace(chr(39), chr(39)+chr(39))}', '{data.replace(chr(39), chr(39)+chr(39))}', CURRENT_TIMESTAMP);"
    
    tmp_sql = f'/tmp/push_{key}.sql'
    with open(tmp_sql, 'w') as f:
        f.write(sql)
    
    sftp.put(tmp_sql, f'/tmp/push_{key}.sql')
    i,o,e = c.exec_command(f'sqlite3 {VPS_DB} < /tmp/push_{key}.sql')
    err = e.read().decode()
    if err:
        print(f'    ERROR: {err}')
    else:
        print(f'    OK')
    
    os.remove(tmp_sql)
    c.exec_command(f'rm /tmp/push_{key}.sql')

sftp.close()

# 4. Verify
print('\nVerifying on VPS:')
i,o,e = c.exec_command(f"sqlite3 {VPS_DB} \"SELECT key, length(data) FROM RmsData\"")
print(o.read().decode())

# 5. Test API
i,o,e = c.exec_command('curl -s http://127.0.0.1:3001/api/rms-data?key=rms-businesses | head -c 200')
result = o.read().decode()
print(f'API test: {result[:200]}')

c.close()
print('Done.')
