export const subscriptionPlan = Object.freeze({id:'ilmigo_plus_annual',amountMinor:1000,currency:'USD',interval:'year',trialDays:3,trialAutoCharges:false});

export function subscriptionSettings(env) {
  if (env.SUBSCRIPTIONS_ENABLED && !['true','false'].includes(env.SUBSCRIPTIONS_ENABLED)) throw new Error('SUBSCRIPTIONS_ENABLED must be true or false.');
  const enabled=env.SUBSCRIPTIONS_ENABLED==='true';
  const productIds=(env.REVENUECAT_ANNUAL_PRODUCT_IDS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(enabled&&(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY||!env.SUPABASE_SERVICE_ROLE_KEY||!env.REVENUECAT_SECRET_KEY||!productIds.length)) throw new Error('Subscriptions require Supabase, RevenueCat server credentials and annual product identifiers.');
  return {enabled,productIds};
}

export function trialStatus(row,now=Date.now()) {
  if(!row)return {available:true,active:false,startedAt:null,expiresAt:null};
  const start=Date.parse(row.started_at),end=Date.parse(row.expires_at);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end-start!==3*86400000)throw new Error('Invalid trial record.');
  return {available:false,active:start<=now&&now<end,startedAt:row.started_at,expiresAt:row.expires_at};
}

export function paidEntitlement(entitlement,allowedProducts=[],now=Date.now()) {
  if(!entitlement)return false;
  if(allowedProducts.length&&(!allowedProducts.includes(entitlement.product_identifier)||entitlement.period_type==='TRIAL'))return false;
  // This plan is a recurring annual subscription; non-expiring grants are not purchases.
  const expiry=Date.parse(entitlement.expires_date);
  return Number.isFinite(expiry)&&expiry>now;
}
