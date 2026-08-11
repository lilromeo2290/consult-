"""
Add barcode to business certificate (modal preview + print view)
Barcode encodes a URL: {origin}/verify/certificate?cert={certNumber}
When scanned, it opens the public certificate verification page.
"""

import re

FILE = '/home/z/my-project/src/components/rms/businesses.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add 'ScanBarcode' icon import ──
assert 'ScanBarcode' not in content, 'ScanBarcode already imported'
old_import = "  Download,\n  Upload,\n} from 'lucide-react';"
new_import = "  Download,\n  Upload,\n  ScanBarcode,\n} from 'lucide-react';"
assert old_import in content, 'Could not find import block'
content = content.replace(old_import, new_import)

# ── 2. Add barcode SVG to certificate modal preview ──
# We need to add it inside the cert-inner div, after the footer section (Note + Signature)
# and before the closing </div> of cert-inner

# The modal preview has this structure at the end of the certificate content:
# </div>  (signature block closing)
# </div>  (footer-section closing)
# </div>  (cert-inner closing div - margin: 35px 40px)
# </div>  (inner border div)
# </div>  (outer border div - 3px solid #8B7355)
# </div>  (p-4 wrapper)

# We want to add the barcode right before the closing of the cert-inner div.
# The cert-inner div in the modal starts with: <div style={{ margin: '35px 40px'...
# and ends just before </div>\n              </div>\n              {/* Modal Footer */}

barcode_modal_html = '''
                      {/* Barcode */}
                      <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #CCCCCC' }}>
                        <svg id="cert-barcode-modal" ref={(el: any) => { if (el) { try { (window as any).JsBarcode(el, \`\${typeof window !== 'undefined' ? window.location.origin : ''}/verify/certificate?cert=\${viewingCert.certNumber}\`, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 11, font: 'Arial', textMargin: 4, margin: 0 }); } catch(e) { console.warn('Barcode render error', e); } } }}></svg>
                        <div style={{ fontFamily: "'Arial', sans-serif", fontSize: '8px', color: '#666666', marginTop: '3px' }}>Scan to verify certificate authenticity</div>
                      </div>'''

# Find the exact insertion point: after the footer section closing, before the cert-inner closing
# In the modal, the footer ends with:
#                       </div>\n                    </div>\n                  </div>\n                </div>\n              </div>\n\n              {/* Modal Footer */}

# Actually, let me find a unique anchor point. The modal has:
# "signature-block" then closing tags, then "Modal Footer"
old_modal_footer = '''              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-700 bg-slate-800 rounded-b-2xl">'''

assert old_modal_footer in content, 'Could not find Modal Footer section'
content = content.replace(old_modal_footer, barcode_modal_html + '\n\n' + old_modal_footer)

# ── 3. Add barcode SVG to print certificate (handlePrintCertificate) ──
# The print view is a window.open with HTML string. We need to add barcode HTML + JS.
# The print HTML has: <script>window.onload = function() { window.print(); }</script></body></html>
# We need to add JsBarcode script and the barcode SVG + render code before the print script.

old_print_script = '''  <script>window.onload = function() { window.print(); }</script></body></html>'''

new_print_script = '''  <!-- Barcode -->
  <div style="text-align:center; margin-top:24px; padding-top:12px; border-top:1px solid #CCCCCC;">
    <svg id="cert-barcode-print"></svg>
    <div style="font-family:Arial,sans-serif; font-size:8px; color:#666; margin-top:3px;">Scan to verify certificate authenticity</div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    window.onload = function() {
      try {
        JsBarcode("#cert-barcode-print", "${'${typeof window !== "undefined" ? window.location.origin : \"https://rms.kma.gov.gh\"}'}/verify/certificate?cert=${businessNumber}", {
          format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 11, font: "Arial", textMargin: 4, margin: 0
        });
      } catch(e) { console.warn("Barcode error", e); }
      window.print();
    };
  </script></body></html>'''

assert old_print_script in content, 'Could not find print script'
content = content.replace(old_print_script, new_print_script)

# ── 4. Fix the barcode URL in print - the template literal nesting is tricky. Let me use a simpler approach. ──
# The businessNumber is already in scope as a const in handlePrintCertificate.
# We need the URL to be the actual origin + /verify/certificate?cert=XXX
# In the print HTML template, we can construct it inline.

# Actually, let me reconsider. The print HTML is constructed via template literals.
# The barcode value needs to be a plain string in the HTML. Let me fix the new_print_script.
# We need to pass the actual origin. In the print context, window.location.origin works.

# Let me re-approach: use a JS variable set before JsBarcode call

new_print_script_v2 = '''  <!-- Barcode -->
  <div style="text-align:center; margin-top:24px; padding-top:12px; border-top:1px solid #CCCCCC;">
    <svg id="cert-barcode-print"></svg>
    <div style="font-family:Arial,sans-serif; font-size:8px; color:#666; margin-top:3px;">Scan to verify certificate authenticity</div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    window.onload = function() {
      try {
        var certUrl = window.location.origin + "/verify/certificate?cert=${businessNumber}";
        JsBarcode("#cert-barcode-print", certUrl, {
          format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 11, font: "Arial", textMargin: 4, margin: 0
        });
      } catch(e) { console.warn("Barcode error", e); }
      window.print();
    };
  </script></body></html>'''

# Replace the already-inserted version with v2
content = content.replace(new_print_script, new_print_script_v2)

# ── 5. Also add a useEffect to dynamically import JsBarcode for the modal barcode ──
# Find a good place to add this - right before the certificate modal
# Actually, the modal barcode uses (window as any).JsBarcode which needs the script loaded.
# Let's add a dynamic import at the top of the component.

# Find the component function start to add the import effect
# The BusinessesPage component starts with: export function BusinessesPage() {
old_component = 'export function BusinessesPage() {'
new_component = '''export function BusinessesPage() {
  // Load JsBarcode for certificate barcode rendering
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).JsBarcode) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);'''

assert old_component in content, 'Could not find BusinessesPage function'
content = content.replace(old_component, new_component)

# ── Write the result ──
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: Added barcode to certificate modal preview and print view')
print('  - Added ScanBarcode icon import')
print('  - Added useEffect to load JsBarcode')
print('  - Added barcode SVG to certificate modal')
print('  - Added barcode SVG + script to print certificate')
