import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProductionConfig } from '../scripts/check-production-config.mjs';

const configured = { APP_ORIGIN: 'https://academy.example.org', SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'public-test-key', SUPABASE_SERVICE_ROLE_KEY: 'private-test-key', OPENAI_API_KEY: 'test-ai-key', PORT: '3000' };
test('production config requires cloud and AI credentials without echoing values', () => {
  assert.deepEqual(checkProductionConfig(configured), []);
  const errors = checkProductionConfig({ ...configured, OPENAI_API_KEY: 'replace-secret-value' });
  assert.equal(errors.length, 1);
  assert.ok(!errors.join().includes('replace-secret-value'));
  assert.ok(checkProductionConfig({}).length >= 5);
});
test('production config rejects insecure URLs, mismatched origins and invalid ports', () => {
  for (const APP_ORIGIN of ['http://example.org', 'https://user:secret@example.org', 'https://example.org/path', 'https://example.org?token=secret']) {
    assert.ok(checkProductionConfig({ ...configured, APP_ORIGIN }).length);
  }
  assert.ok(checkProductionConfig({ ...configured, PORT: '65536' }).length);
  assert.ok(checkProductionConfig({ ...configured, SUPABASE_SERVICE_ROLE_KEY: configured.SUPABASE_ANON_KEY }).length);
});
