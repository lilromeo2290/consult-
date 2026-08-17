#!/bin/bash
curl -s "http://localhost:3008/api/rms-data?key=rms-building-permits" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data=d.get('data')
if data and len(data)>0:
    r=data[0]
    print('typeOfDevelopment:', r.get('typeOfDevelopment'))
    print('natureOfApplication:', r.get('natureOfApplication'))
    print('estimatedCost:', r.get('estimatedCost'))
    print('landSize:', r.get('landSize'))
    print('numberOfFloors:', r.get('numberOfFloors'))
    print('totalFloorArea:', r.get('totalFloorArea'))
"
