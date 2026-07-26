import re
from pathlib import Path

p = Path('lib/automizer/pdf-renderer.ts')
text = p.read_text()
text = text.replace('○', '-')
p.write_text(text)
