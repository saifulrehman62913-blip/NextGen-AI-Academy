#!/usr/bin/env python3
"""Run AFTER native tests and before a paid production build, never on the server catalog."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'shared/catalog.json').read_text())
catalog['lessons']=[]
(root/'mobile/assets/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
print('Paid mobile asset contains language metadata only. Use SUBSCRIPTIONS_REQUIRED=true and a configured HTTPS backend; lessons download only after verified access.')
