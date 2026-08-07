#!/usr/bin/env python3
"""Replace the business certificate template in businesses.tsx to match the new simpler design."""

import re

FILE = '/home/z/my-project/src/components/rms/businesses.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# The old certificate template starts after: win.document.write(`<!DOCTYPE html>
# and ends before the closing backtick and semicolon
# Find the entire template literal content

old_start_marker = "win.document.write(`<!DOCTYPE html>"
old_end_marker = "</html>`);\n    win.document.close();"

# Find the start index
start_idx = content.find(old_start_marker)
if start_idx == -1:
    print("ERROR: Could not find start marker")
    exit(1)

# Find the end index (after the closing)
end_idx = content.find(old_end_marker, start_idx)
if end_idx == -1:
    print("ERROR: Could not find end marker")
    exit(1)

end_idx += len(old_end_marker)

# The new template
new_template = '''win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Business Operating Permit - ${cert.certNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 15mm; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      color: #000;
      background: #f5f5f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .permit-outer {
      width: 760px;
      background: #FFFFFF;
      position: relative;
      border: 3px solid #000;
      border-radius: 4px;
      padding: 40px 50px;
    }
    /* Header */
    .header-section { text-align: center; margin-bottom: 6px; }
    .assembly-name-top { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #000; margin-bottom: 2px; }
    .assembly-motto-local { font-size: 11px; font-weight: 700; color: #000; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 1px; }
    .assembly-motto-english { font-size: 9px; font-weight: 600; color: #444; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; font-style: italic; }
    .assembly-name-repeat { font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #000; margin-bottom: 2px; }
    .permit-title { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; color: #000; margin-top: 12px; margin-bottom: 6px; }
    /* Business Number */
    .biz-number-section { text-align: center; margin: 18px 0 10px; }
    .biz-number-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #333; margin-bottom: 2px; }
    .biz-number-value { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 900; color: #000; }
    /* Legal text */
    .legal-text { text-align: center; font-size: 12px; line-height: 1.9; color: #333; margin: 14px 0 18px; padding: 0 30px; }
    .legal-text .highlight { font-weight: 700; text-transform: uppercase; color: #000; }
    /* Fields */
    .fields-section { margin: 0 auto; max-width: 600px; }
    .field-row { margin-bottom: 12px; }
    .field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #000; margin-bottom: 2px; }
    .field-line { border-bottom: 1.5px solid #000; padding-bottom: 2px; font-size: 14px; font-weight: 700; color: #000; min-height: 22px; }
    /* Separator */
    .separator { border: none; height: 1px; background: #000; margin: 20px 0; }
    /* Dates */
    .dates-section { display: flex; justify-content: flex-start; gap: 50px; margin: 16px 0; }
    .date-block { }
    .date-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #333; margin-bottom: 2px; }
    .date-value { font-size: 12px; font-weight: 700; color: #000; }
    /* Note */
    .note-section { margin: 18px 0 24px; padding: 0 10px; }
    .note-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #000; margin-bottom: 6px; }
    .note-text { font-size: 11px; line-height: 1.7; color: #333; }
    /* Footer */
    .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; }
    .qr-section { text-align: center; }
    .qr-placeholder { width: 80px; height: 80px; border: 1.5px solid #333; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; text-align: center; background: #fafafa; }
    .sign-section { text-align: center; }
    .sign-line { width: 200px; border-bottom: 1.5px solid #000; margin-bottom: 6px; }
    .sign-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #000; }
    .sign-assembly { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #000; margin-top: 2px; }
    @media print {
      body { background: #fff; padding: 0; }
      .permit-outer { border: 3px solid #000; }
    }
  </style>
</head>
<body>
  <div class="permit-outer">
    <div class="permit-inner">

      <!-- Header -->
      <div class="header-section">
        <div class="assembly-name-top">${dynAssemblyName.toUpperCase()}</div>
        <div class="assembly-motto-local">Kpandi Denanyon Yadzɔ</div>
        <div class="assembly-motto-english">(Wisdom and Unity for Development)</div>
        <div class="assembly-name-repeat">${dynAssemblyName.toUpperCase()}</div>
        <div class="permit-title">Business Operating Permit</div>
      </div>

      <!-- Business Number -->
      <div class="biz-number-section">
        <div class="biz-number-label">Business Number</div>
        <div class="biz-number-value">${businessNo}</div>
      </div>

      <!-- Legal Authority Text -->
      <div class="legal-text">
        Issued under the Local Governance Act, 2016 (Act 936)<br/>
        Section 87(1) to operate a business within the<br/>
        <span class="highlight">${dynAssemblyName.toUpperCase()}</span><br/>
        Jurisdiction for the year ${currentYear}.
      </div>

      <hr class="separator">

      <!-- Fields -->
      <div class="fields-section">
        <div class="field-row">
          <div class="field-label">Name of Business</div>
          <div class="field-line">${cert.businessName.toUpperCase()}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Business Location</div>
          <div class="field-line">${(cert.businessAddress || '').toUpperCase()}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Type of Business</div>
          <div class="field-line">${(cert.category || cert.businessType || '').toUpperCase()}</div>
        </div>
      </div>

      <hr class="separator">

      <!-- Dates -->
      <div class="dates-section">
        <div class="date-block">
          <div class="date-label">Date of Issue</div>
          <div class="date-value">${issueDate.toUpperCase()}</div>
        </div>
        <div class="date-block">
          <div class="date-label">Expiry Date</div>
          <div class="date-value">${expiryDate.toUpperCase()}</div>
        </div>
      </div>

      <!-- Note -->
      <div class="note-section">
        <div class="note-label">Note:</div>
        <div class="note-text">
          This Permit is not transferable.<br/>
          Display this Permit at a conspicuous place<br/>
          at the business premises.
        </div>
      </div>

      <!-- Footer -->
      <div class="footer-section">
        <div class="qr-section">
          <div class="qr-placeholder">QR CODE<br/>VERIFICATION</div>
        </div>
        <div class="sign-section">
          <div class="sign-line"></div>
          <div class="sign-title">Signature</div>
          <div class="sign-assembly">${dynAssemblyName.toUpperCase()}</div>
        </div>
      </div>

    </div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
    win.document.close();'''

# Replace
new_content = content[:start_idx] + new_template + content[end_idx:]

with open(FILE, 'w') as f:
    f.write(new_content)

print("SUCCESS: Certificate template updated.")
print(f"Replaced chars from index {start_idx} to {end_idx} ({end_idx - start_idx} chars)")
