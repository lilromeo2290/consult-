#!/usr/bin/env python3
"""Migrate existing certificates: populate businessUniqueNumber, businessLocation, fix expiry."""

import paramiko
import json
import time
import base64

VPS_HOST = '153.75.247.4'
VPS_USER = 'root'
VPS_PASS = 'Do1_BuZe4_M1-V6v1_S4'
DB_PATH = '/home/consult-rms/data/rms.db'

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)

    def run(cmd):
        time.sleep(0.3)
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
        return stdout.read().decode().strip(), stderr.read().decode().strip()

    # Read data from DB
    biz_data, _ = run(f"""sqlite3 {DB_PATH} "SELECT data FROM RmsData WHERE key='rms-businesses'" """)
    cert_data, _ = run(f"""sqlite3 {DB_PATH} "SELECT data FROM RmsData WHERE key='rms-business-certs'" """)
    fin_data, _ = run(f"""sqlite3 {DB_PATH} "SELECT data FROM RmsData WHERE key='rms-settings-financial'" """)

    biz_list = json.loads(biz_data) if biz_data else []
    cert_list = json.loads(cert_data) if cert_data else []
    fin_settings = json.loads(fin_data) if fin_data else {}

    print(f'Businesses: {len(biz_list)}, Certs: {len(cert_list)}')
    print(f'Fiscal Year: {fin_settings.get("currentFinancialYear", "N/A")}')

    # Build lookup from regNumber -> business
    biz_map = {b['regNumber']: b for b in biz_list}

    # Get fiscal year expiry
    fiscal_year = fin_settings.get('currentFinancialYear', '')
    if fiscal_year:
        try:
            fy_int = int(fiscal_year)
            expiry_str = f'{fy_int}-12-31'
        except:
            expiry_str = ''
    else:
        expiry_str = ''
    print(f'New expiry date: {expiry_str}')

    # Migrate each cert
    changed = 0
    for cert in cert_list:
        updated = False
        biz = biz_map.get(cert.get('regNumber', ''))
        if biz:
            if biz.get('businessUniqueNumber') and not cert.get('businessUniqueNumber'):
                cert['businessUniqueNumber'] = biz['businessUniqueNumber']
                updated = True
            if biz.get('locality') and not cert.get('businessLocation'):
                cert['businessLocation'] = biz['locality']
                updated = True
        if expiry_str and cert.get('expiryDate') != expiry_str:
            cert['expiryDate'] = expiry_str
            updated = True
        if updated:
            changed += 1
            print(f'  Updated {cert.get("certNumber","?")}: BUN={cert.get("businessUniqueNumber","-")}, Loc={cert.get("businessLocation","-")}, Exp={cert.get("expiryDate","-")}')

    print(f'Certs to update: {changed}/{len(cert_list)}')

    # Write back via VPS API
    if changed > 0:
        payload = json.dumps({"key": "rms-business-certs", "data": cert_list})
        b64 = base64.b64encode(payload.encode()).decode()
        run(f'echo "{b64}" | base64 -d > /tmp/certs-migrate.json')
        result, err = run("""curl -s -X PUT http://localhost:3001/api/rms-data -H 'Content-Type: application/json' -d @/tmp/certs-migrate.json""")
        print(f'API result: {result[:500]}')
        run('rm -f /tmp/certs-migrate.json')

    # Verify
    verify_data, _ = run(f"""sqlite3 {DB_PATH} "SELECT data FROM RmsData WHERE key='rms-business-certs'" """)
    verify_certs = json.loads(verify_data) if verify_data else []
    print('\nVerified certs:')
    for c in verify_certs:
        print(f'  {c.get("certNumber","?")}: BUN={c.get("businessUniqueNumber","EMPTY")}, Loc={c.get("businessLocation","EMPTY")}, Exp={c.get("expiryDate","EMPTY")}')

    ssh.close()
    print('\nDone!')

if __name__ == '__main__':
    main()
