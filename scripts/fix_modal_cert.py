FILE = '/home/z/my-project/src/components/rms/businesses.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Stack assembly name in modal header
old_modal_asm = """<div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{dynAssemblyName.toUpperCase()}</div>
                        </div>"""

new_modal_asm = """<div style={{ flex: 1 }}>
                          {dynAssemblyName.toUpperCase().split(' ').map((word: string, i: number) => (
                            <div key={i} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '-0.5px', lineHeight: 1.15 }}>{word}</div>
                          ))}
                        </div>"""

assert old_modal_asm in content, 'Could not find modal assembly name block'
content = content.replace(old_modal_asm, new_modal_asm)
print('1. Stacked assembly name in modal header')

# 2. Add watermark + corner ornaments after inner border in modal
old_inner = """                    {/* Inner border */}
                    <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', bottom: '8px', border: '1px solid #8B7355', borderRadius: '14px', pointerEvents: 'none' }} />
                    {/* Content */}"""

new_inner = """                    {/* Inner border */}
                    <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', bottom: '8px', border: '1px solid #8B7355', borderRadius: '14px', pointerEvents: 'none' }} />
                    {/* Watermark */}
                    {_dynLogo && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '350px', height: '350px', opacity: 0.06, zIndex: 0, pointerEvents: 'none' }}>
                        <img src={_dynLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%)' }} />
                      </div>
                    )}
                    {/* Corner Ornaments */}
                    {[["12px","auto","auto","12px"],["12px","12px","auto","auto"],["auto","auto","12px","12px"],["auto","12px","12px","auto"]].map(([top,right,bottom,left], i) => (
                      <div key={i} style={{ position: 'absolute', top, right, bottom, left, width: '60px', height: '60px', zIndex: 1 }}>
                        <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                          <path d="M5 55V20C5 11.716 11.716 5 20 5H55" stroke="#8B7355" strokeWidth="2" fill="none"/>
                          <path d="M5 48V25C5 14.507 13.507 6 24 6H48" stroke="#8B7355" strokeWidth="1" fill="none" opacity="0.5"/>
                          <circle cx="8" cy="8" r="3" fill="#DAA520" opacity="0.6"/>
                          <path d="M12 5C12 5 15 12 5 12" stroke="#DAA520" strokeWidth="1" fill="none" opacity="0.5"/>
                        </svg>
                      </div>
                    ))}
                    {/* Content */}"""

assert old_inner in content, 'Could not find modal inner border section'
content = content.replace(old_inner, new_inner)
print('2. Added watermark + corner ornaments to modal')

# 3. Move barcode inside the certificate container
# The barcode is currently after the certificate outer div closes.
# It should be inside the content div, after the footer section.

# Find the current misplaced barcode and modal footer
old_barcode_section = """                  </div>
                </div>
              </div>


                      {/* Barcode */}
                      <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #CCCCCC' }}>
                        <svg id="cert-barcode-modal" ref={(el: any) => { if (el) { try { (window as any).JsBarcode(el, `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/certificate?cert=${viewingCert.certNumber}`, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 11, font: 'Arial', textMargin: 4, margin: 0 }); } catch(e) { console.warn('Barcode render error', e); } } }}></svg>
                        <div style={{ fontFamily: "'Arial', sans-serif", fontSize: '8px', color: '#666666', marginTop: '3px' }}>Scan to verify certificate authenticity</div>
                      </div>

              {/* Modal Footer */}"""

new_barcode_section = """                  </div>

                      {/* Barcode */}
                      <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #CCCCCC' }}>
                        <svg id="cert-barcode-modal" ref={(el: any) => { if (el) { try { (window as any).JsBarcode(el, `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/certificate?cert=${viewingCert.certNumber}`, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 11, font: 'Arial', textMargin: 4, margin: 0 }); } catch(e) { console.warn('Barcode render error', e); } } }}></svg>
                        <div style={{ fontFamily: "'Arial', sans-serif", fontSize: '8px', color: '#666666', marginTop: '3px' }}>Scan to verify certificate authenticity</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}"""

assert old_barcode_section in content, 'Could not find misplaced barcode section'
content = content.replace(old_barcode_section, new_barcode_section)
print('3. Moved barcode inside certificate container')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: All modal certificate updates applied')
