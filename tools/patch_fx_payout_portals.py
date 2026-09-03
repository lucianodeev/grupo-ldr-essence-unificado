from pathlib import Path
import re

SELLER=Path('rede-comercial-final/vendedor.html')
ADMIN=Path('rede-comercial-final/admin.html')

# -------- Seller --------
s=SELLER.read_text(encoding='utf-8')
if 'id="payoutCurrencyInfo"' not in s:
    s=s.replace('<div id="paymentMsg"></div>','<div id="payoutCurrencyInfo" class="payment-note small"></div><div id="paymentMsg"></div>',1)

# enrich payment functions
old="function togglePaymentFields(){const t=E('payoutType').value;E('pixFields').classList.toggle('hidden',t!=='PIX');E('ibanFields').classList.toggle('hidden',t!=='IBAN');E('pixKey').required=t==='PIX';E('iban').required=t==='IBAN'}"
new="function payoutCurrency(){return E('payoutType').value==='PIX'?'BRL':'EUR'}function payoutCurrencyCopy(){const c=payoutCurrency();const o={pt:`Você receberá suas comissões em ${c}. Se a venda for feita em outra moeda, a comissão será convertida automaticamente pela cotação registrada na data da venda.`,fr:`Vous recevrez vos commissions en ${c}. Si la vente est réalisée dans une autre devise, la commission sera convertie automatiquement selon le taux enregistré à la date de la vente.`,en:`You will receive your commissions in ${c}. If a sale is made in another currency, the commission will be converted automatically using the rate recorded on the sale date.`,es:`Recibirás tus comisiones en ${c}. Si una venta se realiza en otra moneda, la comisión se convertirá automáticamente usando la cotización registrada en la fecha de la venta.`};return o[lang]||o.pt}function updatePayoutCurrencyInfo(){if(E('payoutCurrencyInfo'))E('payoutCurrencyInfo').innerHTML='<b>'+payoutCurrency()+'</b> — '+esc(payoutCurrencyCopy())}function togglePaymentFields(){const t=E('payoutType').value;E('pixFields').classList.toggle('hidden',t!=='PIX');E('ibanFields').classList.toggle('hidden',t!=='IBAN');E('pixKey').required=t==='PIX';E('iban').required=t==='IBAN';updatePayoutCurrencyInfo()}"
if old in s:
    s=s.replace(old,new,1)

old_load="async function loadPayment(){if(!token())return;const{data,error}=await db.rpc('ldr_simple_payment_get',{p_token:token()});if(error){console.error(error);return}const d=data||{};renderPaymentLabels(!!d.configured);if(d.configured){E('payoutType').value=d.payout_type||'PIX';E('accountHolder').value=d.account_holder_name||'';E('pixKey').value=d.pix_key||'';E('iban').value=d.iban||'';E('bicSwift').value=d.bic_swift||'';E('bankName').value=d.bank_name||'';E('bankCountry').value=d.bank_country||''}togglePaymentFields()}"
new_load="async function loadPayment(){if(!token())return;const{data,error}=await db.rpc('ldr_simple_payment_get',{p_token:token()});if(error){console.error(error);return}const d=data||{};window._ldrPayment=d;renderPaymentLabels(!!d.configured);if(d.configured){E('payoutType').value=d.payout_type||'PIX';E('accountHolder').value=d.account_holder_name||'';E('pixKey').value=d.pix_key||'';E('iban').value=d.iban||'';E('bicSwift').value=d.bic_swift||'';E('bankName').value=d.bank_name||'';E('bankCountry').value=d.bank_country||''}togglePaymentFields()}"
if old_load in s:
    s=s.replace(old_load,new_load,1)

s=s.replace("renderPaymentLabels(true);msg('paymentMsg',paymentText().saved,true)","renderPaymentLabels(true);await loadPayment();msg('paymentMsg',paymentText().saved,true)",1)

if 'async function fetchLdrFxRate' not in s:
    fxjs=r'''function fxDateText(d){return d?new Date(d+'T12:00:00').toLocaleDateString(lang==='pt'?'pt-BR':lang==='fr'?'fr-FR':lang==='es'?'es-ES':'en-US'):''}
async function fetchLdrFxRate(dateStr){try{const u=`https://api.frankfurter.app/${dateStr}?from=EUR&to=BRL`;const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error('fx');const j=await r.json();const rate=Number(j?.rates?.BRL);if(!rate||rate<=0)throw new Error('fx');return{rate,date:j.date||dateStr,source:'Frankfurter / ECB reference rates'}}catch(e){return null}}
function saleFxDetails(x){const original=money(x.commission_original_cents??x.commission_cents,x.currency);const pc=x.payout_currency||x.currency;if(x.conversion_status==='pending')return `<br><span class="small" style="color:#805900"><b>${lang==='fr'?'Conversion en attente':lang==='en'?'Conversion pending':lang==='es'?'Conversión pendiente':'Conversão pendente'}</b></span>`;if(pc!==x.currency&&x.exchange_rate){return `<br><span class="small">${lang==='fr'?'Commission originale':lang==='en'?'Original commission':lang==='es'?'Comisión original':'Comissão original'}: ${original}<br>${lang==='fr'?'Taux utilisé':lang==='en'?'Rate used':lang==='es'?'Cotización usada':'Cotação utilizada'}: €1 = R$${Number(x.exchange_rate).toFixed(4)} · ${fxDateText(x.exchange_rate_date)}<br><b>${lang==='fr'?'À recevoir':lang==='en'?'Amount to receive':lang==='es'?'A recibir':'A receber'}: ${money(x.commission_converted_cents,pc)}</b></span>`}return `<br><span class="small"><b>${lang==='fr'?'À recevoir':lang==='en'?'Amount to receive':lang==='es'?'A recibir':'A receber'}: ${money(x.commission_converted_cents??x.commission_cents,pc)}</b> · ${lang==='fr'?'Sans conversion':lang==='en'?'No currency conversion':lang==='es'?'Sin conversión':'Sem conversão cambial'}</span>`}
async function retryPendingFx(){const{data,error}=await db.rpc('ldr_simple_seller_dashboard',{p_token:token()});if(error)return false;let changed=false;for(const x of(data.sales||[])){if(x.conversion_status!=='pending')continue;const d=(x.created_at||'').slice(0,10)||new Date().toISOString().slice(0,10);const fx=await fetchLdrFxRate(d);if(!fx)continue;const r=await db.rpc('ldr_simple_set_sale_fx',{p_token:token(),p_sale_id:x.id,p_exchange_rate:fx.rate,p_exchange_rate_date:fx.date,p_exchange_source:fx.source});if(!r.error)changed=true}return changed}
'''
    s=s.replace('function tr(k)',fxjs+'function tr(k)',1)

# sales list rendering
pattern=r"E\('salesList'\)\.innerHTML=\(data\.sales\|\|\[\]\)\.map\(x=>`<div class=\"item\">.*?</div>`\)\.join\(''\)\|\|'<p class=\"small\">—</p>';E\('payoutList'\)"
repl="E('salesList').innerHTML=(data.sales||[]).map(x=>`<div class=\"item\"><b>${esc(x.customer_name)}</b> — ${esc(x.service_name)}<br><span class=\"small\">${money(x.amount_cents,x.currency)} · ${x.commission_rate}% = ${money(x.commission_original_cents??x.commission_cents,x.currency)} · <span class=\"badge ${x.status}\">${statusLabel(x.status)}</span></span>${saleFxDetails(x)}</div>`).join('')||'<p class=\"small\">—</p>';E('payoutList')"
s,n=re.subn(pattern,repl,s,count=1)
if n==0:
    raise SystemExit('seller sales list pattern not found')

# sale submit handler
pattern=r"E\('saleForm'\)\.addEventListener\('submit',async e=>\{.*?\}\);const _payBaseDashboard=loadDashboard;"
handler=r'''E('saleForm').addEventListener('submit',async e=>{e.preventDefault();const p=C.find(v=>v[0]===E('product').value)||C[0];const pay=window._ldrPayment||{};if(!pay.configured)return msg('saleMsg',lang==='fr'?'Enregistrez d’abord vos données de paiement.':lang==='en'?'Please save your payment details first.':lang==='es'?'Primero registra tus datos de pago.':'Cadastre primeiro seus dados para recebimento.',false);const saleCurr=E('currency').value;const payCurr=pay.payout_type==='PIX'?'BRL':'EUR';let fx=null;if(saleCurr!==payCurr){fx=await fetchLdrFxRate(new Date().toISOString().slice(0,10))}const{data:saleId,error}=await db.rpc('ldr_simple_create_sale_fx',{p_token:token(),p_customer_name:E('customer').value.trim(),p_service_name:serviceName(p),p_amount:Number(E('amount').value),p_currency:saleCurr,p_category:p[1],p_exchange_rate:fx?.rate??null,p_exchange_rate_date:fx?.date??null,p_exchange_source:fx?.source??null});if(error)return msg('saleMsg',error.message,false);e.target.reset();renderCatalog();const pending=!fx&&saleCurr!==payCurr;msg('saleMsg',pending?(lang==='fr'?'Vente enregistrée. Conversion en attente; le système réessaiera automatiquement.':lang==='en'?'Sale registered. Currency conversion is pending; the system will retry automatically.':lang==='es'?'Venta registrada. Conversión pendiente; el sistema volverá a intentarlo automáticamente.':'Venda cadastrada. Conversão pendente; o sistema tentará novamente automaticamente.'):(lang==='fr'?'Vente enregistrée avec la devise de paiement définie.':lang==='en'?'Sale registered with payout currency recorded.':lang==='es'?'Venta registrada con la moneda de pago definida.':'Venda cadastrada com a moeda de recebimento registrada.'));await loadDashboard()});const _payBaseDashboard=loadDashboard;'''
s,n=re.subn(pattern,handler,s,count=1,flags=re.S)
if n==0:
    raise SystemExit('seller sale handler pattern not found')

old="loadDashboard=async function(){await _payBaseDashboard();if(token())await loadPayment()}"
new="loadDashboard=async function(){await _payBaseDashboard();if(token()){await loadPayment();const changed=await retryPendingFx();if(changed){await _payBaseDashboard();await loadPayment()}}}"
if old not in s:
    raise SystemExit('seller dashboard wrapper not found')
s=s.replace(old,new,1)
SELLER.write_text(s,encoding='utf-8')

# -------- Admin --------
s=ADMIN.read_text(encoding='utf-8')
old="const bySeller={};(data.sales||[]).forEach(x=>{bySeller[x.seller_id]??={EUR:0,BRL:0};if(x.status==='available')bySeller[x.seller_id][x.currency]+=x.commission_cents});"
new="const bySeller={};(data.sales||[]).forEach(x=>{bySeller[x.seller_id]??={EUR:0,BRL:0};const pc=x.payout_currency||x.currency;if(x.status==='available'&&x.conversion_status!=='pending')bySeller[x.seller_id][pc]+=Number(x.commission_converted_cents??x.commission_cents)||0});"
if old not in s: raise SystemExit('admin bySeller anchor not found')
s=s.replace(old,new,1)

pattern=r"E\('sales'\)\.innerHTML=\(data\.sales\|\|\[\]\)\.map\(x=>`<div class=\"item\">.*?</div>`\)\.join\(''\)\|\|'<p class=\"small\">Nenhuma venda cadastrada\.</p>';E\('payouts'\)"
repl="E('sales').innerHTML=(data.sales||[]).map(x=>{const pc=x.payout_currency||x.currency;const fx=x.conversion_status==='pending'?'<br><span class=\"small\" style=\"color:#805900\"><b>Conversão cambial pendente</b></span>':pc!==x.currency&&x.exchange_rate?`<br><span class=\"small\">Comissão original: ${money(x.commission_original_cents??x.commission_cents,x.currency)} · Cotação: €1 = R$${Number(x.exchange_rate).toFixed(4)} · ${x.exchange_rate_date?new Date(x.exchange_rate_date+'T12:00:00').toLocaleDateString('pt-BR'):'—'}<br><b>A pagar: ${money(x.commission_converted_cents,pc)} (${pc})</b></span>`:`<br><span class=\"small\"><b>A pagar: ${money(x.commission_converted_cents??x.commission_cents,pc)} (${pc})</b> · Sem conversão cambial</span>`;return `<div class=\"item\"><b>${esc(x.seller_name)}</b> → ${esc(x.customer_name)}<br><b>${esc(x.service_name)}</b> · ${money(x.amount_cents,x.currency)}<br><span class=\"small\">Comissão ${x.commission_rate}% = ${money(x.commission_original_cents??x.commission_cents,x.currency)} · <span class=\"badge ${x.status}\">${statusLabel(x.status)}</span></span>${fx}<div class=\"row\" style=\"margin-top:8px\">${x.status==='pending'&&x.conversion_status!=='pending'?`<button class=\"btn primary\" onclick=\"setStatus('${x.id}','available')\">Conferir e liberar comissão</button>`:''}${x.status==='pending'?`<button class=\"btn danger\" onclick=\"setStatus('${x.id}','rejected')\">Recusar</button>`:''}</div></div>`}).join('')||'<p class=\"small\">Nenhuma venda cadastrada.</p>';E('payouts')"
s,n=re.subn(pattern,repl,s,count=1)
if n==0: raise SystemExit('admin sales list pattern not found')

s=s.replace("<span><b>Tipo:</b> Pix / BRL</span>","<span><b>Tipo:</b> Pix / BRL</span><span><b>Moeda de recebimento:</b> BRL</span>",1)
s=s.replace("<span><b>Tipo:</b> IBAN / EUR</span>","<span><b>Tipo:</b> IBAN / EUR</span><span><b>Moeda de recebimento:</b> EUR</span>",1)
ADMIN.write_text(s,encoding='utf-8')
print('FX payout patch applied')
