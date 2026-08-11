#!/usr/bin/env python3
"""Center the logo and assembly name in the print certificate HTML template."""

FILE = '/home/z/my-project/src/components/rms/businesses.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# 1. Replace .header-section CSS (in template literal, spaces not \n)
# The CSS in the template literal uses actual newlines represented as \n in the source
old_css_section = '.header-section {      display: flex;      align-items: center;      gap: 20px;      margin-bottom: 30px;    }'
new_css_section = '.header-section {      text-align: center;      margin-bottom: 30px;    }'
if old_css_section in content:
    content = content.replace(old_css_section, new_css_section)
    print('Replaced .header-section CSS')
else:
    print('WARNING: .header-section CSS not found')

# 2. Replace .header-logo CSS
old_css_logo = '.header-logo {      width: 110px;      height: 110px;      flex-shrink: 0;    }'
new_css_logo = '.header-logo {      width: 110px;      height: 110px;      margin: 0 auto 14px auto;    }'
if old_css_logo in content:
    content = content.replace(old_css_logo, new_css_logo)
    print('Replaced .header-logo CSS')
else:
    print('WARNING: .header-logo CSS not found')

# 3. Replace .header-text CSS
old_css_text = '.header-text {      flex: 1;    }'
new_css_text = '.header-text {    }'
if old_css_text in content:
    content = content.replace(old_css_text, new_css_text)
    print('Replaced .header-text CSS')
else:
    print('WARNING: .header-text CSS not found')

# 4. Remove header-divider HTML - use the exact string found
old_html = "</div>        <div class=\"header-divider\"></div>        <div class=\"header-text\">"
new_html = "</div>        <div class=\"header-text\">"
if old_html in content:
    content = content.replace(old_html, new_html)
    print('Removed header-divider HTML')
else:
    print('WARNING: header-divider HTML not found, trying alternate')
    # Try with different spacing
    content = content.replace('<div class="header-divider"></div>\n        ', '')
    print('Attempted alternate removal')

with open(FILE, 'w') as f:
    f.write(content)

# Verify
if '<div class="header-divider"></div>' in content:
    print('ERROR: header-divider HTML still present!')
else:
    print('SUCCESS: header-divider HTML removed')
