FILE = '/home/z/my-project/src/components/rms/businesses.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The barcode is currently OUTSIDE the certificate content div, between closing divs.
# Move it INSIDE the content div, before the content div's closing tag.

# Find the misplaced barcode + the extra closing divs
old_section = '''                      </div>
                    </div>
                  </div>

                      {/* Barcode */}
                      <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #CCCCCC' }}>
                        <svg id="cert-barcode-modal" ref={(el: any) => { if (el) { try { (window as any).JsBarcode(el, `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/certificate?cert=${viewingCert.certNumber}`, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 11, font: 'Arial', textMargin: 4, margin: 0 }); } catch(e) { console.warn('Barcode render error', e); } } }}></svg>
                        <div style={{ fontFamily: "'Arial', sans-serif", fontSize: '8px', color: '#666666', marginTop: '3px' }}>Scan to verify certificate authenticity</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>'''

new_section = '''                      {/* Barcode */}
                      <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #CCCCCC' }}>
                        <svg id="cert-barcode-modal" ref={(el: any) => { if (el) { try { (window as any).JsBarcode(el, `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/certificate?cert=${viewingCert.certNumber}`, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 11, font: 'Arial', textMargin: 4, margin: 0 }); } catch(e) { console.warn('Barcode render error', e); } } }}></svg>
                        <div style={{ fontFamily: "'Arial', sans-serif", fontSize: '8px', color: '#666666', marginTop: '3px' }}>Scan to verify certificate authenticity</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>'''

assert old_section in content, 'Could not find misplaced barcode section'
content = content.replace(old_section, new_section)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: Moved barcode inside certificate content div')
