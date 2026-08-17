#!/bin/bash
echo "=== First 500 chars of BP data ==="
sqlite3 /home/kpma-rms-build-fresh/db/custom.db "SELECT substr(data, 1, 500) FROM RmsData WHERE key='rms-building-permits';"
echo "=== Count BP records ==="
node -e "
const d = $(sqlite3 /home/kpma-rms-build-fresh/db/custom.db "SELECT data FROM RmsData WHERE key='rms-building-permits';");
try { const arr = JSON.parse(d); console.log('BP records:', arr.length); if(arr[0]) console.log('First record keys:', Object.keys(arr[0]).join(', ')); } catch(e) { console.log('Parse error'); }
"
