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
test('paid launch preflight blocks disabled payments and placeholder merchant setup',()=>{
 assert.ok(checkProductionConfig(configured,{paid:true}).length>=3);
 const paid={...configured,SUBSCRIPTIONS_ENABLED:'true',REVENUECAT_SECRET_KEY:'server-test-key',REVENUECAT_ANNUAL_PRODUCT_IDS:'ilmigo_plus_annual'};
 assert.deepEqual(checkProductionConfig(paid,{paid:true}),[]);
 assert.ok(checkProductionConfig({...paid,REVENUECAT_SECRET_KEY:'replace-sensitive-merchant-value'},{paid:true}).length);
 assert.ok(!checkProductionConfig({...paid,REVENUECAT_SECRET_KEY:'replace-sensitive-merchant-value'},{paid:true}).join().includes('sensitive-merchant-value'));
 assert.ok(checkProductionConfig({...paid,REVENUECAT_ANNUAL_PRODUCT_IDS:'annual,annual'},{paid:true}).length);
});
