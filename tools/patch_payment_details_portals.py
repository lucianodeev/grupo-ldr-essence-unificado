from pathlib import Path

SELLER='rede-comercial-final/vendedor.html'
ADMIN='rede-comercial-final/admin.html'

# ---------- Seller ----------
p=Path(SELLER)
s=p.read_text(encoding='utf-8')
if 'id="paymentDetailsCard"' not in s:
    css='''.payment-card{border:1px solid #d9c184;background:linear-gradient(145deg,#fffdf7,#fff)}.payment-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.payment-note{background:#f3f7fb;border:1px solid var(--l);border-radius:11px;padding:11px;margin:10px 0}.payment-status{display:inline-block;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:900;background:#fff4cc;color:#805900}.payment-status.saved{background:#dcfae6;color:#087443}@media(max-width:650px){.payment-fields{grid-template-columns:1fr}}'''
    s=s.replace('</style>',css+'</style>',1)
    card='''<div id="paymentDetailsCard" class="card payment-card"><div class="section-title"><div><div class="eyebrow" id="payEyebrow">DADOS PARA RECEBIMENTO</div><h2 id="payTitle">Cadastre onde deseja receber suas comissões</h2></div><span id="payStatus" class="payment-status">Não cadastrado</span></div><p id="payIntro" class="small">Esses dados ficam registrados apenas para facilitar o pagamento manual das suas comissões pela LDR.</p><form id="paymentForm"><div class="payment-fields"><label><span id="payTypeLabel">Forma de recebimento</span><select id="payoutType" class="field"><option value="PIX">Pix — Brasil / BRL</option><option value="IBAN">Conta em euro — IBAN / EUR</option></select></label><label><span id="holderLabel">Nome completo do titular</span><input id="accountHolder" class="field" required autocomplete="name"></label></div><div id="pixFields"><label><span id="pixLabel">Chave Pix</span><input id="pixKey" class="field" placeholder="CPF, e-mail, telefone ou chave aleatória"></label></div><div id="ibanFields" class="hidden"><div class="payment-fields"><label><span id="ibanLabel">IBAN</span><input id="iban" class="field" autocomplete="off" placeholder="BE00 0000 0000 0000"></label><label><span id="bicLabel">BIC / SWIFT</span><input id="bicSwift" class="field" autocomplete="off"></label><label><span id="bankLabel">Nome do banco</span><input id="bankName" class="field"></label><label><span id="bankCountryLabel">País do banco</span><input id="bankCountry" class="field"></label></div></div><div class="payment-note small" id="payNote">A LDR não movimenta sua conta por este painel. Os dados são usados somente para consulta e transferência manual.</div><div id="paymentMsg"></div><button class="btn primary" type="submit" id="savePaymentBtn">Salvar dados para pagamento</button></form></div>'''
    anchor='<div id="recurringPlans" class="card plan-section"></div>'
    if anchor not in s: raise SystemExit('seller payment anchor not found')
    s=s.replace(anchor,card+anchor,1)

    js=r'''const PAYMENT_COPY={
pt:{eyebrow:'DADOS PARA RECEBIMENTO',title:'Cadastre onde deseja receber suas comissões',intro:'Esses dados ficam registrados apenas para facilitar o pagamento manual das suas comissões pela LDR.',status0:'Não cadastrado',status1:'Dados cadastrados',type:'Forma de recebimento',holder:'Nome completo do titular',pix:'Chave Pix',iban:'IBAN',bic:'BIC / SWIFT',bank:'Nome do banco',country:'País do banco',note:'A LDR não movimenta sua conta por este painel. Os dados são usados somente para consulta e transferência manual.',save:'Salvar dados para pagamento',saved:'Dados para recebimento salvos com sucesso.'},
fr:{eyebrow:'DONNÉES DE PAIEMENT',title:'Indiquez où recevoir vos commissions',intro:'Ces données sont enregistrées uniquement afin de faciliter le paiement manuel de vos commissions par LDR.',status0:'Non renseigné',status1:'Données enregistrées',type:'Mode de paiement',holder:'Nom complet du titulaire',pix:'Clé Pix',iban:'IBAN',bic:'BIC / SWIFT',bank:'Nom de la banque',country:'Pays de la banque',note:'LDR ne peut pas accéder ni déplacer des fonds depuis votre compte. Ces données servent uniquement à la consultation et au virement manuel.',save:'Enregistrer les données de paiement',saved:'Données de paiement enregistrées.'},
en:{eyebrow:'PAYMENT DETAILS',title:'Choose where you want to receive your commissions',intro:'These details are stored only to make LDR manual commission payments easier.',status0:'Not configured',status1:'Details saved',type:'Payment method',holder:'Account holder full name',pix:'Pix key',iban:'IBAN',bic:'BIC / SWIFT',bank:'Bank name',country:'Bank country',note:'LDR cannot access or move funds from your account through this portal. These details are used only for reference and manual transfer.',save:'Save payment details',saved:'Payment details saved successfully.'},
es:{eyebrow:'DATOS DE PAGO',title:'Indica dónde deseas recibir tus comisiones',intro:'Estos datos se guardan únicamente para facilitar el pago manual de tus comisiones por LDR.',status0:'No registrado',status1:'Datos registrados',type:'Forma de pago',holder:'Nombre completo del titular',pix:'Clave Pix',iban:'IBAN',bic:'BIC / SWIFT',bank:'Nombre del banco',country:'País del banco',note:'LDR no puede acceder ni mover fondos de tu cuenta desde este panel. Los datos se utilizan solo para consulta y transferencia manual.',save:'Guardar datos de pago',saved:'Datos de pago guardados correctamente.'}};
function paymentText(){return PAYMENT_COPY[lang]||PAYMENT_COPY.pt}
function togglePaymentFields(){const t=E('payoutType').value;E('pixFields').classList.toggle('hidden',t!=='PIX');E('ibanFields').classList.toggle('hidden',t!=='IBAN');E('pixKey').required=t==='PIX';E('iban').required=t==='IBAN'}
function renderPaymentLabels(configured=false){const q=paymentText();E('payEyebrow').textContent=q.eyebrow;E('payTitle').textContent=q.title;E('payIntro').textContent=q.intro;E('payTypeLabel').textContent=q.type;E('holderLabel').textContent=q.holder;E('pixLabel').textContent=q.pix;E('ibanLabel').textContent=q.iban;E('bicLabel').textContent=q.bic;E('bankLabel').textContent=q.bank;E('bankCountryLabel').textContent=q.country;E('payNote').textContent=q.note;E('savePaymentBtn').textContent=q.save;E('payStatus').textContent=configured?q.status1:q.status0;E('payStatus').classList.toggle('saved',configured)}
async function loadPayment(){if(!token())return;const{data,error}=await db.rpc('ldr_simple_payment_get',{p_token:token()});if(error){console.error(error);return}const d=data||{};renderPaymentLabels(!!d.configured);if(d.configured){E('payoutType').value=d.payout_type||'PIX';E('accountHolder').value=d.account_holder_name||'';E('pixKey').value=d.pix_key||'';E('iban').value=d.iban||'';E('bicSwift').value=d.bic_swift||'';E('bankName').value=d.bank_name||'';E('bankCountry').value=d.bank_country||''}togglePaymentFields()}
E('payoutType').addEventListener('change',togglePaymentFields);
E('paymentForm').addEventListener('submit',async e=>{e.preventDefault();const{data,error}=await db.rpc('ldr_simple_payment_save',{p_token:token(),p_payout_type:E('payoutType').value,p_account_holder_name:E('accountHolder').value.trim(),p_pix_key:E('pixKey').value.trim()||null,p_iban:E('iban').value.trim()||null,p_bic_swift:E('bicSwift').value.trim()||null,p_bank_name:E('bankName').value.trim()||null,p_bank_country:E('bankCountry').value.trim()||null});if(error)return msg('paymentMsg',error.message,false);renderPaymentLabels(true);msg('paymentMsg',paymentText().saved,true)});
'''
    marker='function tr(k)'
    if marker not in s: raise SystemExit('seller payment js marker not found')
    s=s.replace(marker,js+marker,1)
    s=s.replace('renderPlans();renderOnboarding();if(token())loadDashboard()', 'renderPlans();renderOnboarding();renderPaymentLabels(false);if(token())loadDashboard()',1)
    tail='window.signup=signup;window.login=login;window.logout=logout;applyLang(lang);loadDashboard();'
    if tail not in s: raise SystemExit('seller payment tail not found')
    s=s.replace(tail,"const _payBaseDashboard=loadDashboard;loadDashboard=async function(){await _payBaseDashboard();if(token())await loadPayment()};window.signup=signup;window.login=login;window.logout=logout;applyLang(lang);loadDashboard();",1)
    p.write_text(s,encoding='utf-8')

# ---------- Admin ----------
p=Path(ADMIN)
s=p.read_text(encoding='utf-8')
if 'id="paymentAdminSection"' not in s:
    css='''.payment-admin-row{border:1px solid var(--line);border-radius:12px;padding:12px;margin:9px 0;background:#fbfcfe}.payment-admin-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px 16px;margin-top:8px}.payment-admin-grid span{font-size:13px}.not-configured{background:#fff4cc;color:#805900}.configured{background:#dcfae6;color:#087443}@media(max-width:650px){.payment-admin-grid{grid-template-columns:1fr}}'''
    s=s.replace('</style>',css+'</style>',1)
    section='''<div id="paymentAdminSection" class="card"><h2>Dados para pagamento dos vendedores</h2><p class="small">Consulta dos dados cadastrados pelos vendedores para você realizar os pagamentos manualmente. Nenhuma transferência é executada por este painel.</p><div id="paymentAdminRows"></div></div>'''
    anchor='<div id="trainingSection" class="card">'
    if anchor not in s: raise SystemExit('admin payment anchor not found')
    s=s.replace(anchor,section+anchor,1)
    js=r'''async function loadPaymentAdmin(){const{data,error}=await db.rpc('ldr_simple_admin_payment_list',{p_token:token()});if(error){console.error(error);return}E('paymentAdminRows').innerHTML=(data||[]).map(r=>{if(!r.configured)return `<div class="payment-admin-row"><div class="row"><div style="flex:1"><b>${esc(r.name)}</b><br><span class="small">${esc(r.email)} · ${esc(r.country||'')}</span></div><span class="badge not-configured">NÃO CADASTRADO</span></div></div>`;const details=r.payout_type==='PIX'?`<span><b>Tipo:</b> Pix / BRL</span><span><b>Titular:</b> ${esc(r.account_holder_name)}</span><span><b>Chave Pix:</b> ${esc(r.pix_key)}</span>`:`<span><b>Tipo:</b> IBAN / EUR</span><span><b>Titular:</b> ${esc(r.account_holder_name)}</span><span><b>IBAN:</b> ${esc(r.iban)}</span><span><b>BIC/SWIFT:</b> ${esc(r.bic_swift||'—')}</span><span><b>Banco:</b> ${esc(r.bank_name||'—')}</span><span><b>País do banco:</b> ${esc(r.bank_country||'—')}</span>`;return `<div class="payment-admin-row"><div class="row"><div style="flex:1"><b>${esc(r.name)}</b><br><span class="small">${esc(r.email)} · ${esc(r.country||'')}</span></div><span class="badge configured">CADASTRADO</span></div><div class="payment-admin-grid">${details}</div><div class="small" style="margin-top:8px">Atualizado: ${r.updated_at?new Date(r.updated_at).toLocaleString('pt-BR'):'—'}</div></div>`}).join('')||'<p class="small">Nenhum vendedor cadastrado.</p>'}
'''
    marker='async function loadTraining()'
    if marker not in s: raise SystemExit('admin payment js marker not found')
    s=s.replace(marker,js+marker,1)
    old="const _baseLoad=load;load=async function(){await _baseLoad();if(token())await loadTraining()};"
    new="const _baseLoad=load;load=async function(){await _baseLoad();if(token()){await loadTraining();await loadPaymentAdmin()}};"
    if old not in s: raise SystemExit('admin payment load wrapper not found')
    s=s.replace(old,new,1)
    p.write_text(s,encoding='utf-8')

print('payment details portal patch applied')
