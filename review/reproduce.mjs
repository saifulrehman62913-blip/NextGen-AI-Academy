// Current regression checks. Historical defective behavior/evidence is archived
// under review/history and is not the current acceptance criterion.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const result=spawnSync(process.execPath,['--test','--test-isolation=none','tests/review-regression.test.mjs','tests/preview.test.mjs'],{cwd:root,stdio:'inherit'});
process.exit(result.status??1);
