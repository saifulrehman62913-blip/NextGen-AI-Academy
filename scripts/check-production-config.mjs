// Checks presence and URL shape only. Never contacts providers or prints secrets.
import { pathToFileURL } from 'node:url';
import { subscriptionSettings } from '../server/subscription.mjs';

export function checkProductionConfig(env, {paid = false} = {}) {
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
  if (paid) {
    if (env.SUBSCRIPTIONS_ENABLED !== 'true') issues.push('Paid launch requires SUBSCRIPTIONS_ENABLED=true.');
    const value = env.REVENUECAT_SECRET_KEY?.trim();
    if (!value || /^(your[-_ ]|replace|example|placeholder)/i.test(value)) issues.push('REVENUECAT_SECRET_KEY: missing or placeholder server credential.');
    const ids = (env.REVENUECAT_ANNUAL_PRODUCT_IDS || '').split(',').map(s=>s.trim()).filter(Boolean);
    if (!ids.length || new Set(ids).size !== ids.length) issues.push('REVENUECAT_ANNUAL_PRODUCT_IDS: set distinct annual store product identifiers.');
  }
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issues = checkProductionConfig(process.env, {paid: process.argv.includes('--paid')});
  for (const issue of issues) console.error(issue);
  console.log('Configuration shape check only; provider access, migrations, email delivery, billing, content review and store signing still require verification.');
  if (issues.length) process.exitCode = 1;
  else console.log('Required cloud/AI configuration fields are present. No provider connection was attempted.');
}
