// Checks presence and URL shape only. Never contacts providers or prints secrets.
import { pathToFileURL } from 'node:url';
import { subscriptionSettings } from '../server/subscription.mjs';

export function checkProductionConfig(env) {
  const issues = [];
  try { subscriptionSettings(env); } catch(error) { issues.push(error.message); }
  const httpsURL = (name, originOnly = false) => {
    try {
      const url = new URL(env[name]);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
          (originOnly && url.pathname !== '/')) throw new Error();
    } catch { issues.push(`${name}: set a valid HTTPS ${originOnly ? 'origin' : 'URL'} without credentials, query or fragment.`); }
  };
  httpsURL('APP_ORIGIN', true);
  httpsURL('SUPABASE_URL', true);
  for (const name of ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY']) {
    const value = env[name]?.trim();
    if (!value || /^(your[-_ ]|replace|example|placeholder)/i.test(value)) issues.push(`${name}: missing or placeholder value.`);
  }
  if (env.SUPABASE_ANON_KEY && env.SUPABASE_ANON_KEY === env.SUPABASE_SERVICE_ROLE_KEY) issues.push('Supabase public and service-role keys must be different.');
  if (env.PORT && (!/^\d+$/.test(env.PORT) || Number(env.PORT) < 1 || Number(env.PORT) > 65535)) issues.push('PORT: expected an integer from 1 to 65535.');
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issues = checkProductionConfig(process.env);
  for (const issue of issues) console.error(issue);
  console.log('Configuration shape check only; provider access, migrations, email delivery, billing, content review and store signing still require verification.');
  if (issues.length) process.exitCode = 1;
  else console.log('Required cloud/AI configuration fields are present. No provider connection was attempted.');
}
