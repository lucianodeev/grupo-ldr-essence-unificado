from pathlib import Path

# Seller portal
p=Path('rede-comercial-final/vendedor.html')
s=p.read_text(encoding='utf-8')
if 'id="academyCard"' not in s:
    card='''<div id="academyCard" class="card" style="border:1px solid #e6d29b;background:linear-gradient(145deg,#fffaf0,#fff)"><div class="eyebrow">ACADEMIA COMERCIAL LDR</div><h2>Formação Inicial em Vendas</h2><p class="small">Treinamento prático com 25 módulos, quizzes de aprendizagem, progresso salvo e certificado interno de conclusão.</p><div class="row"><a class="btn gold" href="academia-vendas.html">Entrar na Academia</a><a class="btn ghost" href="apresentacao-vendedores.html">Ver apresentação inicial</a></div></div>'''
    anchor='<div id="recurringPlans" class="card plan-section"></div>'
    if anchor not in s: raise SystemExit('seller anchor not found')
    s=s.replace(anchor,card+anchor,1)
    p.write_text(s,encoding='utf-8')

# Admin portal
p=Path('rede-comercial-final/admin.html')
s=p.read_text(encoding='utf-8')
if 'id="trainingSection"' not in s:
    css='''.train-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.train-stat{background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:12px}.train-stat b{font-size:22px;display:block}.train-progress{height:8px;background:#e8edf2;border-radius:999px;overflow:hidden;margin:7px 0}.train-progress i{display:block;height:100%;background:var(--gold)}.train-row{border:1px solid var(--line);border-radius:12px;padding:12px;margin:9px 0}.status-not_started{background:#f0f2f4}.status-in_progress{background:#fff4cc}.status-completed{background:#dcfae6}@media(max-width:760px){.train-grid{grid-template-columns:1fr 1fr}}'''
    s=s.replace('</style>',css+'</style>',1)
    section='''<div id="trainingSection" class="card"><h2>Treinamento dos vendedores</h2><p class="small">Acompanhe quem iniciou, progresso atual, quizzes, conclusão e certificado da Academia Comercial LDR.</p><div class="train-grid"><div class="train-stat"><b id="trTotal">0</b><span class="small">Vendedores</span></div><div class="train-stat"><b id="trNot">0</b><span class="small">Não iniciaram</span></div><div class="train-stat"><b id="trProgress">0</b><span class="small">Em andamento</span></div><div class="train-stat"><b id="trDone">0</b><span class="small">Concluíram</span></div><div class="train-stat"><b id="trCert">0</b><span class="small">Certificados</span></div></div><div id="trainingRows" style="margin-top:12px"></div></div>'''
    anchor='<div class="card"><h2>Histórico de pagamentos</h2><div id="payouts"></div></div>'
    if anchor not in s: raise SystemExit('admin html anchor not found')
    s=s.replace(anchor,section+anchor,1)
    js="""async function loadTraining(){const{data,error}=await db.rpc('ldr_training_admin_dashboard',{p_token:token()});if(error){console.error(error);return}E('trTotal').textContent=data.total||0;E('trNot').textContent=data.not_started||0;E('trProgress').textContent=data.in_progress||0;E('trDone').textContent=data.completed||0;E('trCert').textContent=data.certificates||0;E('trainingRows').innerHTML=(data.rows||[]).map(r=>{const st=r.status==='completed'?'CONCLUÍDO':r.status==='in_progress'?'EM ANDAMENTO':'NÃO INICIADO';const last=r.last_access_at?new Date(r.last_access_at).toLocaleString('pt-BR'):'—';const start=r.started_at?new Date(r.started_at).toLocaleDateString('pt-BR'):'—';const cert=r.certificate_code?`<br><span class=\"small\"><b>Certificado:</b> ${esc(r.certificate_code)}</span>`:'';return `<div class=\"train-row\"><div class=\"row\"><div style=\"flex:1\"><b>${esc(r.name)}</b><br><span class=\"small\">${esc(r.email)} · ${esc(r.country||'')}</span></div><span class=\"badge status-${r.status}\">${st}</span></div><div class=\"train-progress\"><i style=\"width:${r.progress_percent||0}%\"></i></div><div class=\"row small\"><span><b>Progresso:</b> ${r.progress_percent||0}%</span><span><b>Módulo:</b> ${r.current_module||1}/25</span><span><b>Quiz:</b> ${r.quiz_correct||0}/${r.quiz_total||0}</span><span><b>Início:</b> ${start}</span><span><b>Último acesso:</b> ${last}</span>${cert}</div></div>`}).join('')||'<p class=\"small\">Nenhum vendedor cadastrado.</p>'}"""
    marker='async function setStatus(id,status)'
    if marker not in s: raise SystemExit('admin js anchor not found')
    s=s.replace(marker,js+marker,1)
    old="E('payouts').innerHTML=(data.payouts||[]).map"
    if old not in s: raise SystemExit('admin load anchor not found')
    # add call after payout render function closes, easiest before load function final closing marker
    target="||'<p class=\"small\">Nenhum pagamento registrado.</p>'}</n"
    # robust insertion before setStatus marker: call will be invoked after main load via tail wrapper
    s=s.replace("window.loginAdmin=loginAdmin;", "const _baseLoad=load;load=async function(){await _baseLoad();if(token())await loadTraining()};window.loginAdmin=loginAdmin;",1)
    p.write_text(s,encoding='utf-8')

print('academy portal patches applied')
