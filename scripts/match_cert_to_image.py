"""
Update business certificate to match the reference image exactly:
1. Stack assembly name on 3 lines (KPANDO / MUNICIPAL / ASSEMBLY)
2. Add corner ornaments to modal (print already has them)
3. Add watermark to modal (print already has it)
4. Move barcode inside the certificate container
5. Same changes for print view
"""

FILE = '/home/z/my-project/src/components/rms/businesses.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ══════════════════════════════════════════════════════════════
# 1. MODAL: Stack assembly name (split by spaces, each on own line)
# ══════════════════════════════════════════════════════════════

old_asm_name_modal = '''<div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{dynAssemblyName.toUpperCase()}</div>
                        </div>'''

new_asm_name_modal = '''<div style={{ flex: 1 }}>
                          {dynAssemblyName.toUpperCase().split(' ').map((word: string, i: number) => (
                            <div key={i} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '-0.5px', lineHeight: 1.15 }}>{word}</div>
                          ))}
                        </div>'''

assert old_asm_name_modal in content, 'Could not find modal assembly name'
content = content.replace(old_asm_name_modal, new_asm_name_modal)

# ══════════════════════════════════════════════════════════════
# 2. MODAL: Add watermark + corner ornaments
# ══════════════════════════════════════════════════════════════

# Add watermark after inner border div
old_inner_border = """                    {/* Inner border */}
                    <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', bottom: '8px', border: '1px solid #8B7355', borderRadius: '14px', pointerEvents: 'none' }} />
                    {/* Content */}"""

new_inner_border = """                    {/* Inner border */}
                    <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', bottom: '8px', border: '1px solid #8B7355', borderRadius: '14px', pointerEvents: 'none' }} />
                    {/* Watermark */}
                    {_dynLogo && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '350px', height: '350px', opacity: 0.06, zIndex: 0, pointerEvents: 'none' }}>
                        <img src={_dynLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%)' }} />
                      </div>
                    )}
                    {/* Corner Ornaments */}
                    {['top:12px;left:12px', 'top:12px;right:12px;transform:rotate(90deg)', 'bottom:12px;left:12px;transform:rotate(-90deg)', 'bottom:12px;right:12px;transform:rotate(180deg)'].map((pos, i) => (
                      <div key={i} style={{ position: 'absolute', ...Object.fromEntries(pos.split(';').map(p => { const [k,v] = p.split(':'); return [k.trim(), v.trim()]; })), width: '60px', height: '60px', zIndex: 1 }}>
                        <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                          <path d="M5 55V20C5 11.716 11.716 5 20 5H55" stroke="#8B7355" strokeWidth="2" fill="none"/>
                          <path d="M5 48V25C5 14.507 13.507 6 24 6H48" stroke="#8B7355" strokeWidth="1" fill="none" opacity="0.5"/>
                          <circle cx="8" cy="8" r="3" fill="#DAA520" opacity="0.6"/>
                          <path d="M12 5C12 5 15 12 5 12" stroke="#DAA520" strokeWidth="1" fill="none" opacity="0.5"/>
                        </svg>
                      </div>
                    ))}
                    {/* Content */}"""

assert old_inner_border in content, 'Could not find inner border section'
content = content.replace(old_inner_border, new_inner_border)

# ══════════════════════════════════════════════════════════════
# 3. MODAL: Move barcode inside certificate container
# ══════════════════════════════════════════════════════════════

# The barcode is currently AFTER the certificate container. Move it inside, before </div> of content
old_barcode_outside = '''

                      {/* Barcode */}
                      <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #CCCCCC' }}>
                        <svg id="cert-barcode-modal" ref={(el: any) => { if (el) { try { (window as any).JsBarcode(el, `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/certificate?cert=${viewingCert.certNumber}`, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 11, font: 'Arial', textMargin: 4, margin: 0 }); } catch(e) { console.warn('Barcode render error', e); } } }}></svg>
                        <div style={{ fontFamily: "'Arial', sans-serif", fontSize: '8px', color: '#666666', marginTop: '3px' }}>Scan to verify certificate authenticity</div>
                      </div>

              {/* Modal Footer */}'''

# This barcode should be inside the cert content div, after the footer section
# Find the end of the footer section and place barcode there
old_footer_end = '''                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


                      {/* Barcode */}'''

new_footer_with_barcode = '''                        </div>
                      </div>

                      {/* Barcode */}
                      <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #CCCCCC' }}>
                        <svg id="cert-barcode-modal" ref={(el: any) => { if (el) { try { (window as any).JsBarcode(el, `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/certificate?cert=${viewingCert.certNumber}`, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 11, font: 'Arial', textMargin: 4, margin: 0 }); } catch(e) { console.warn('Barcode render error', e); } } }}></svg>
                        <div style={{ fontFamily: "'Arial', sans-serif", fontSize: '8px', color: '#666666', marginTop: '3px' }}>Scan to verify certificate authenticity</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* Modal Footer */}'''

assert old_barcode_outside in content, 'Could not find barcode outside certificate'
content = content.replace(old_barcode_outside, new_footer_with_barcode)

# ══════════════════════════════════════════════════════════════
# 4. PRINT VIEW: Stack assembly name
# ══════════════════════════════════════════════════════════════

old_asm_print_html = '<div class="assembly-name">\${dynAssemblyName.toUpperCase()}</div>'

new_asm_print_html = '''<div class="assembly-name">
        ${dynAssemblyName.toUpperCase().split(' ').join('<br/>')}
      </div>'''

assert old_asm_print_html in content, 'Could not find print assembly name'
content = content.replace(old_asm_print_html, new_asm_print_html)

# ══════════════════════════════════════════════════════════════
# 5. PRINT VIEW: Also stack the assembly name in legal text
# ══════════════════════════════════════════════════════════════
# The legal text also references the assembly name on one line.
# In the print HTML it's: ${dynAssemblyName.toUpperCase()}
# We need to stack it there too

old_legal_asm_print = '<span class="bold-asm">\${dynAssemblyName.toUpperCase()}</span>'
new_legal_asm_print = '<span class="bold-asm">\${dynAssemblyName.toUpperCase().split(" ").join("<br/>")}</span>'

assert old_legal_asm_print in content, 'Could not find print legal assembly name'
content = content.replace(old_legal_asm_print, new_legal_asm_print)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: Updated certificate to match reference image')
print('  1. Stacked assembly name on 3 lines (modal + print)')
print('  2. Added corner ornaments to modal')
print('  3. Added watermark to modal')
print('  4. Moved barcode inside certificate container')
print('  5. Stacked assembly name in legal text (print)')