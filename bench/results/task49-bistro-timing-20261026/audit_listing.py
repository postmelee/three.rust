"""Post-build regular-file and directory-link inventory check; no source edits.
This check closes the original builder's file-only final listing scope. Its
future-reproduction builder also performs the same exact link-set check.
"""
from pathlib import Path
import argparse,hashlib,json

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('archive',type=Path);p.add_argument('--root',type=Path,required=True);p.add_argument('--final-root',type=Path,required=True);p.add_argument('--viewer-root',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();roots={'repository':a.root.resolve(strict=True),'final':a.final_root.resolve(strict=True)};idx=json.loads((a.archive/'archive-index.json').read_text());links=json.loads((a.archive/'preparation-links.json').read_text())['links'];records=[]
 for item in [*idx['sourceSuites'],*idx['sourceEvidence'],*idx['preparationSources']]:
  source=item['sourceDirectory'];alias,relative=source.split('/',1);root=roots[alias]/relative;expected=sorted({row['sourcePath'].removeprefix(source+'/') for row in idx['files'] if row['sourcePath'].startswith(source+'/')});paths=list(root.rglob('*'));files=sorted(str(p.relative_to(root)) for p in paths if p.is_file());assert files==expected,'Regular files differ from archived inventory';wanted={row['sourcePath'].removeprefix(source+'/'):row for row in links if row['sourcePath'].startswith(source+'/')};actual={str(p.relative_to(root)):p for p in paths if p.is_symlink()};assert set(actual)==set(wanted),'Additional or missing source directory link'
  for name,link in actual.items():
   raw=str(link.readlink()).encode();row=wanted[name];assert hashlib.sha256(raw).hexdigest()==row['originalTargetSha256'] and len(raw)==row['originalTargetBytes'];assert link.resolve(strict=True)==a.viewer_root.resolve(strict=True)/'node_modules' and link.is_dir() and name=='source/node_modules'
  records.append({'sourceDirectory':source,'regularFiles':len(files),'directorySymlinks':sorted(actual),'regularFilesMatchArchive':True,'linkSetExact':True})
 result={'status':'pass','scope':'Post-build exact regular-file and directory-symlink path inventories; exact approved link-target hashes checked without dependency-directory traversal. Source payload hashes were already rechecked by the builder.','records':records,'originalSourcesModified':False}
 with a.out.open('x') as f:json.dump(result,f,indent=2);f.write('\n')
 print(json.dumps({'status':'pass','sourceTrees':len(records),'approvedDirectoryLinks':sum(len(r['directorySymlinks']) for r in records)}))
if __name__=='__main__':main()
