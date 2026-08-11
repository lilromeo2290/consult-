FILE = '/home/z/my-project/src/components/rms/businesses.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Count div opens and closes from line 877 (certificate modal) to 1038
opens = 0
closes = 0
for i in range(876, 1039):
    line = lines[i]
    # Count <div but not </div> and not <div/> 
    import re
    o = len(re.findall(r'<div[\s>]', line))
    c = len(re.findall(r'</div>', line))
    if o > 0 or c > 0:
        print(f'{i+1:4d}: +{o} -{c}  {line.rstrip()[:100]}')
    opens += o
    closes += c

print(f'\nTotal: +{opens} -{closes}  net={opens - closes}')