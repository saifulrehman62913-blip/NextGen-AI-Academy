#!/usr/bin/env python3
"""Prepare a minimal source checkout without keys, caches or derived course assets.
Does not create a repository, upload files or start a remote build.
"""
from pathlib import Path
import argparse,hashlib,json,zipfile,shutil
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--checkout',help='Optional new empty local checkout directory')
args=parser.parse_args()
files=[]
for directory,patterns in [('scripts',['*.py','*.mjs']),('shared',['*.mjs']),('server',['*.mjs']),('web',['*.html','*.js','*.css','*.svg','*.webmanifest']),('tests',['*.mjs']),('mobile/lib',['*.dart']),('mobile/test',['*.dart']),('supabase/migrations',['*.sql']),('.github/workflows',['*.yml']),('review',['*.md','*.mjs','*.json','*.txt']),('review/build',['*.json','*.log']),('review/cloud',['*.json']),('review/history',['*.json','*.txt']),('courses',['*.md'])]:
 for pattern in patterns:
  files.extend((root/directory).glob(pattern))
files.extend(root/name for name in ['README.md','package.json','.gitignore','.env.example','Dockerfile','.dockerignore','mobile/pubspec.yaml'])
files=sorted(set(files))
out=root/'release';out.mkdir(exist_ok=True)
manifest={'purpose':'Ready-to-upload source. Repository choice/public visibility must be confirmed before upload.','files':[]}
with zipfile.ZipFile(out/'ILMIGO-github-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for path in files:
  data=path.read_bytes();relative=path.relative_to(root).as_posix()
  assert path.name!='.env' and '__pycache__' not in path.parts
  manifest['files'].append({'path':relative,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
  z.writestr(relative,data)
(out/'github-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if args.checkout:
 target=Path(args.checkout).resolve()
 if target.exists() and any(target.iterdir()):raise SystemExit('Checkout target must be new or empty.')
 target.mkdir(parents=True,exist_ok=True)
 for path in files:
  destination=target/path.relative_to(root);destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,destination)
print(f'Prepared {len(files)} source files; no remote changes performed.')
