#!/bin/bash
curl -s "http://localhost:3008/api/rms-data?key=rms-rate-overrides-permit" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data'); print(type(data).__name__); print(json.dumps(data, indent=2)[:3000] if data else 'EMPTY')"
