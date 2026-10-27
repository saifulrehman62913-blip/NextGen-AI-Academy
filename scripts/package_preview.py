#!/usr/bin/env python3
"""Create a self-contained, offline-capable preview. No server or account needed."""
from pathlib import Path
import base64
import json
import re
root=Path(__file__).resolve().parents[1]
css=(root/'web/style.css').read_text()
css=re.sub(r"@import url\([^;]+;",'',css)
logic='\n'.join(re.sub(r"^import[^\n]+\n",'',(root/f'shared/{name}.mjs').read_text(),flags=re.M).replace('export ','') for name in ['learning','schema','accounts','parent'])
app=(root/'web/app.js').read_text()
app=re.sub(r"^import[^\n]+\n",'',app,flags=re.M)
app=app.replace("if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});",'')
icon='data:image/svg+xml;base64,'+base64.b64encode((root/'web/icon.svg').read_bytes()).decode()
app=app.replace('/icon.svg',icon)
catalog=(root/'shared/catalog.json').read_text()
mock='''
const offlineCatalog=CATALOG;
window.fetch=async function(input){
 const path=String(input);
 if(path==='/shared/catalog.json'||path==='/api/catalog')return new Response(JSON.stringify(offlineCatalog),{status:200});
 if(path==='/api/config')return new Response(JSON.stringify({cloud:false,ai:false,purchases:false}),{status:200});
 return new Response(JSON.stringify({error:'Cloud is not connected in the standalone preview. Run the full project to connect services.'}),{status:503});
};
'''.replace('CATALOG',catalog)
script=mock+'\n'+logic+'\n'+app
# JSON is trusted bundled content, but always escape HTML script closing sequences.
script=script.replace('</script','<\\/script')
html='''<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ILMIGO DIGITAL ACADEMY · Learning preview</title><link rel="icon" href="ICON"><style>CSS</style></head><body><div id="app"></div><div id="overlay"></div><div id="toast" role="status" aria-live="polite"></div><script type="module">SCRIPT</script></body></html>'''
html=html.replace('ICON',icon).replace('CSS',css).replace('SCRIPT',script)
(root/'ILMIGO-preview.html').write_text(html)
print('Created ILMIGO-preview.html (self-contained; cloud features disabled).')
