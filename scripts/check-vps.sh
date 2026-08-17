#!/bin/bash
echo "=== DB Files ==="
find /home/kpma-rms -name "*.db" 2>/dev/null
echo "=== .env ==="
cat /home/kpma-rms/.env 2>/dev/null || echo "no .env"
echo "=== PM2 ENV ==="
pm2 env kpma-rms 2>/dev/null | grep -i database || echo "no db env"
echo "=== Tables ==="
cd /home/kpma-rms && for db in $(find . -name "*.db"); do echo "--- $db ---"; sqlite3 "$db" ".tables" 2>/dev/null; done
