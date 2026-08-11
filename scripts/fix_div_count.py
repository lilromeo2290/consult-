FILE = '/home/z/my-project/src/components/rms/businesses.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Current: barcode div closes, then content, outer border, p-4, then modal footer
# We need: barcode div closes, then content, outer border, p-4 #f0ece0, p-4 wrapper, then modal footer

old_close = '''                      </div>
                    </div>
                  </div>
                </div>

              {/* Modal Footer */}'''

new_close = '''                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}'''

assert old_close in content, 'Could not find close section'
content = content.replace(old_close, new_close)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: Added missing closing div')
