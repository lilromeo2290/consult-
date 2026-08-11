with open('/home/z/my-project/src/components/rms/businesses.tsx', 'r') as f:
    content = f.read()

# The data fields currently have empty dots. Replace with actual values.
old_data_fields = '''        <div class="data-row">          <div class="data-label">1. Business Number</div>          <div class="data-dots"></div>        </div>        <div class="data-row">          <div class="data-label">2. Business Location</div>          <div class="data-dots"></div>        </div>        <div class="data-row">          <div class="data-label">3. Business Class</div>          <div class="data-dots"></div>        </div>        <div class="data-row">          <div class="data-label">4. Business Category</div>          <div class="data-dots"></div>        </div>'''

new_data_fields = '''        <div class="data-row">          <div class="data-label">1. Business Number</div>          <div class="data-value">${businessNumber}</div>        </div>        <div class="data-row">          <div class="data-label">2. Business Location</div>          <div class="data-value">${businessLocation}</div>        </div>        <div class="data-row">          <div class="data-label">3. Business Class</div>          <div class="data-value">${businessType}</div>        </div>        <div class="data-row">          <div class="data-label">4. Business Category</div>          <div class="data-value">${businessCategory}</div>        </div>'''

assert old_data_fields in content, 'Could not find old data fields!'
content = content.replace(old_data_fields, new_data_fields, 1)

# Add CSS for .data-value to match the dotted-line style but show text
old_dots_css = '''    .data-dots {      flex: 1;      border-bottom: 1px dotted #555555;      min-height: 18px;    }'''

new_dots_css = '''    .data-value {      flex: 1;      font-family: 'Times New Roman', Times, Georgia, serif;      font-size: 15px;      font-weight: 600;      color: #000000;      border-bottom: 1px dotted #555555;      padding-bottom: 2px;      padding-left: 8px;    }'''

assert old_dots_css in content, 'Could not find data-dots CSS!'
content = content.replace(old_dots_css, new_dots_css, 1)

with open('/home/z/my-project/src/components/rms/businesses.tsx', 'w') as f:
    f.write(content)

print('Certificate data fields fixed successfully')
