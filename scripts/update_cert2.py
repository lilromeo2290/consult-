#!/usr/bin/env python3
"""Replace the business certificate template in businesses.tsx to match the ornate design."""

FILE = '/home/z/my-project/src/components/rms/businesses.tsx'

with open(FILE, 'r') as f:
    content = f.read()

old_start_marker = "win.document.write(`<!DOCTYPE html>"
old_end_marker = "</html>`);\n    win.document.close();"

start_idx = content.find(old_start_marker)
if start_idx == -1:
    print("ERROR: Could not find start marker")
    exit(1)

end_idx = content.find(old_end_marker, start_idx)
if end_idx == -1:
    print("ERROR: Could not find end marker")
    exit(1)

end_idx += len(old_end_marker)

new_template = '''win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Business Operating Permit - ${cert.certNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Playfair+Display:wght@700;900&family=Cinzel:wght@700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 12mm; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      color: #000;
      background: #f0ece0;
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
      border: 4px solid #B8860B;
      border-radius: 6px;
      padding: 6px;
    }
    .permit-outer::before {
      content: '';
      position: absolute;
      inset: 10px;
      border: 2px solid #B8860B;
      border-radius: 4px;
      pointer-events: none;
    }
    /* Corner scrollwork */
    .corner { position: absolute; width: 70px; height: 70px; z-index: 2; }
    .corner svg { width: 100%; height: 100%; }
    .corner-tl { top: 16px; left: 16px; }
    .corner-tr { top: 16px; right: 16px; transform: scaleX(-1); }
    .corner-bl { bottom: 16px; left: 16px; transform: scaleY(-1); }
    .corner-br { bottom: 16px; right: 16px; transform: scale(-1, -1); }
    .permit-inner {
      margin: 20px;
      padding: 20px 40px 28px;
      position: relative;
      z-index: 1;
    }
    /* Watermark */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      height: 300px;
      opacity: 0.04;
      pointer-events: none;
      z-index: 0;
    }
    .watermark img { width: 100%; height: 100%; object-fit: contain; }
    /* Header */
    .header-section { text-align: center; margin-bottom: 4px; position: relative; z-index: 1; }
    .seal-img { width: 90px; height: 90px; object-fit: contain; margin: 0 auto 6px; display: block; }
    .assembly-name { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #000; margin-bottom: 2px; }
    .assembly-motto { font-size: 10px; font-weight: 700; color: #555; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 2px; }
    .permit-title-row { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 10px; margin-bottom: 4px; }
    .title-line { flex: 1; max-width: 120px; height: 2px; background: linear-gradient(90deg, transparent, #B8860B, transparent); }
    .permit-title { font-family: 'Cinzel', 'Playfair Display', serif; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; color: #000; white-space: nowrap; }
    /* Business Number */
    .biz-number-section { text-align: center; margin: 16px 0 10px; }
    .biz-number-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #333; margin-bottom: 2px; }
    .biz-number-value { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 900; color: #991B1B; }
    /* Legal text */
    .legal-text { text-align: center; font-size: 11.5px; line-height: 1.8; color: #333; margin: 14px 0; font-style: italic; padding: 0 20px; }
    .legal-text .highlight { font-weight: 700; text-transform: uppercase; color: #000; font-style: normal; }
    /* Separator */
    .separator { border: none; height: 1.5px; background: linear-gradient(90deg, transparent, #B8860B, #333, #B8860B, transparent); margin: 18px 0; }
    /* Fields */
    .fields-section { margin: 0 auto; max-width: 620px; }
    .field-row { display: flex; align-items: baseline; margin-bottom: 14px; gap: 10px; }
    .field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #000; min-width: 180px; text-align: left; flex-shrink: 0; }
    .field-dots { flex: 1; border-bottom: 1.5px dotted #555; padding-bottom: 2px; font-size: 14px; font-weight: 700; color: #000; min-height: 20px; }
    /* Dates */
    .dates-section { max-width: 620px; margin: 0 auto; }
    .date-row { display: flex; align-items: baseline; margin-bottom: 10px; gap: 10px; }
    .date-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #000; min-width: 180px; text-align: left; flex-shrink: 0; }
    .date-value { font-size: 13px; font-weight: 700; color: #000; }
    .date-value sup { font-size: 8px; }
    /* Note */
    .note-section { margin: 18px 0 10px; padding: 0 10px; }
    .note-label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #991B1B; margin-bottom: 6px; }
    .note-text { font-size: 11px; line-height: 1.7; color: #333; }
    /* Footer */
    .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 18px; padding: 0 10px; }
    .qr-section { text-align: center; }
    .qr-placeholder { width: 75px; height: 75px; border: 1.5px solid #333; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; text-align: center; background: #fafafa; }
    .sign-section { text-align: center; }
    .sign-line { width: 220px; border-bottom: 2px dotted #333; margin-bottom: 6px; }
    .sign-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #991B1B; }
    .sign-assembly { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #991B1B; margin-top: 2px; }
    @media print {
      body { background: #fff; padding: 0; }
      .permit-outer { border: 4px solid #B8860B; }
    }
  </style>
</head>
<body>
  <div class="permit-outer">
    <!-- Corner scrollwork decorations -->
    <div class="corner corner-tl"><svg viewBox="0 0 70 70"><path d="M5,60 Q5,5 60,5" fill="none" stroke="#B8860B" stroke-width="3"/><path d="M10,55 Q10,10 55,10" fill="none" stroke="#B8860B" stroke-width="1.5"/><path d="M15,50 Q15,15 50,15" fill="none" stroke="#B8860B" stroke-width="1" opacity="0.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="#B8860B" stroke-width="1.5"/><circle cx="12" cy="12" r="1.5" fill="#B8860B"/><path d="M8,30 Q20,20 30,8" fill="none" stroke="#B8860B" stroke-width="1.5" opacity="0.6"/></svg></div>
    <div class="corner corner-tr"><svg viewBox="0 0 70 70"><path d="M5,60 Q5,5 60,5" fill="none" stroke="#B8860B" stroke-width="3"/><path d="M10,55 Q10,10 55,10" fill="none" stroke="#B8860B" stroke-width="1.5"/><path d="M15,50 Q15,15 50,15" fill="none" stroke="#B8860B" stroke-width="1" opacity="0.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="#B8860B" stroke-width="1.5"/><circle cx="12" cy="12" r="1.5" fill="#B8860B"/><path d="M8,30 Q20,20 30,8" fill="none" stroke="#B8860B" stroke-width="1.5" opacity="0.6"/></svg></div>
    <div class="corner corner-bl"><svg viewBox="0 0 70 70"><path d="M5,60 Q5,5 60,5" fill="none" stroke="#B8860B" stroke-width="3"/><path d="M10,55 Q10,10 55,10" fill="none" stroke="#B8860B" stroke-width="1.5"/><path d="M15,50 Q15,15 50,15" fill="none" stroke="#B8860B" stroke-width="1" opacity="0.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="#B8860B" stroke-width="1.5"/><circle cx="12" cy="12" r="1.5" fill="#B8860B"/><path d="M8,30 Q20,20 30,8" fill="none" stroke="#B8860B" stroke-width="1.5" opacity="0.6"/></svg></div>
    <div class="corner corner-br"><svg viewBox="0 0 70 70"><path d="M5,60 Q5,5 60,5" fill="none" stroke="#B8860B" stroke-width="3"/><path d="M10,55 Q10,10 55,10" fill="none" stroke="#B8860B" stroke-width="1.5"/><path d="M15,50 Q15,15 50,15" fill="none" stroke="#B8860B" stroke-width="1" opacity="0.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="#B8860B" stroke-width="1.5"/><circle cx="12" cy="12" r="1.5" fill="#B8860B"/><path d="M8,30 Q20,20 30,8" fill="none" stroke="#B8860B" stroke-width="1.5" opacity="0.6"/></svg></div>

    <div class="permit-inner">
      <!-- Watermark -->
      <div class="watermark"><img src="/logos/assembly-seal.png" /></div>

      <!-- Header -->
      <div class="header-section">
        <img class="seal-img" src="/logos/assembly-seal.png" />
        <div class="assembly-name">${dynAssemblyName.toUpperCase()}</div>
        <div class="assembly-motto">(Wisdom and Unity for Development)</div>

        <div class="permit-title-row">
          <div class="title-line"></div>
          <div class="permit-title">${dynAssemblyName.toUpperCase()}</div>
          <div class="title-line"></div>
        </div>
        <div class="permit-title" style="font-size:18px; letter-spacing:4px; margin-top:2px;">Business Operating Permit</div>
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
          <div class="field-label">Name of Business:</div>
          <div class="field-dots">${cert.businessName.toUpperCase()}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Business Location:</div>
          <div class="field-dots">${(cert.businessAddress || '').toUpperCase()}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Type of Business:</div>
          <div class="field-dots">${(cert.category || cert.businessType || '').toUpperCase()}</div>
        </div>
      </div>

      <hr class="separator">

      <!-- Dates -->
      <div class="dates-section">
        <div class="date-row">
          <div class="date-label">Date of Issue:</div>
          <div class="date-value">${issueDate}</div>
        </div>
        <div class="date-row">
          <div class="date-label">Expiry Date:</div>
          <div class="date-value">${expiryDate}</div>
        </div>
      </div>

      <!-- Note -->
      <div class="note-section">
        <div class="note-label">NOTE:</div>
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

new_content = content[:start_idx] + new_template + content[end_idx:]

with open(FILE, 'w') as f:
    f.write(new_content)

print(f"SUCCESS: Certificate template updated.")
print(f"Replaced {end_idx - start_idx} chars with {len(new_template)} chars.")
