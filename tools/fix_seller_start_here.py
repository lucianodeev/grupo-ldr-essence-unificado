from pathlib import Path
import re

p=Path('rede-comercial-final/vendedor.html')
s=p.read_text(encoding='utf-8')

css='''.academy-mini-progress{height:10px;background:#ffffff2b;border-radius:999px;overflow:hidden;margin:12px 0 7px}.academy-mini-progress i{display:block;height:100%;background:#d4a64f;width:0}.academy-meta{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 14px}.academy-meta span{background:#ffffff14;border:1px solid #ffffff2b;border-radius:999px;padding:6px 9px;font-size:12px;color:#eef5fb}.start-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:14px 0}.start-step{background:#ffffff10;border:1px solid #ffffff24;border-radius:12px;padding:11px}.start-step b{display:block;color:#f2c96f;margin-bottom:4px}.start-step span{font-size:12px;color:#dce8f4}@media(max-width:650px){.start-steps{grid-template-columns:1fr}}'''
if '.academy-mini-progress' not in s:
    s=s.replace('</style>',css+'</style>',1)

# Remove old standalone academy card so the Academy appears only in Start Here.
old='''<div id="academyCard" class="card" style="border:1px solid #e6d29b;background:linear-gradient(145deg,#fffaf0,#fff)"><div class="eyebrow">ACADEMIA COMERCIAL LDR</div><h2>Formação Inicial em Vendas</h2><p class="small">Treinamento prático com 25 módulos, quizzes de aprendizagem, progresso salvo e certificado interno de conclusão.</p><div class="row"><a class="btn gold" href="academia-vendas.html">Entrar na Academia</a><a class="btn ghost" href="apresentacao-vendedores.html">Ver apresentação inicial</a></div></div>'''
s=s.replace(old,'',1)

new_js=r'''const ONBOARDING_COPY={
pt:{tag:'COMECE POR AQUI',title:'Sua jornada de vendedor começa aqui',text:'A Academia Comercial LDR é o primeiro passo. Depois, use o catálogo e as comissões como apoio e comece a registrar suas vendas reais.',step1:'1 · Faça a formação inicial',step1d:'25 módulos práticos, quizzes de aprendizagem e certificado interno.',step2:'2 · Conheça catálogo e comissões',step2d:'Revise soluções, planos e percentuais antes de falar com o cliente.',step3:'3 · Comece a vender',step3d:'Registre cliente, serviço/produto e valor diretamente no painel.',start:'Iniciar Academia',continue:'Continuar treinamento',presentation:'Ver apresentação inicial',catalog:'Ver catálogo',status0:'Não iniciado',status1:'Em andamento',status2:'Concluído',module:'Módulo',progress:'Progresso',certificate:'Certificado disponível'},
fr:{tag:'COMMENCEZ ICI',title:'Votre parcours vendeur commence ici',text:'L’Académie Commerciale LDR est la première étape. Ensuite, utilisez le catalogue et les commissions comme support et commencez à enregistrer vos ventes réelles.',step1:'1 · Suivez la formation initiale',step1d:'25 modules pratiques, quiz d’apprentissage et certificat interne.',step2:'2 · Découvrez catalogue et commissions',step2d:'Consultez solutions, plans et pourcentages avant de parler au client.',step3:'3 · Commencez à vendre',step3d:'Enregistrez client, service/produit et montant dans votre espace.',start:'Commencer l’Académie',continue:'Continuer la formation',presentation:'Voir la présentation initiale',catalog:'Voir le catalogue',status0:'Non commencé',status1:'En cours',status2:'Terminé',module:'Module',progress:'Progression',certificate:'Certificat disponible'},
en:{tag:'START HERE',title:'Your seller journey starts here',text:'The LDR Commercial Academy is your first step. Then use the catalog and commission table as support and start registering real sales.',step1:'1 · Complete initial training',step1d:'25 practical modules, learning quizzes and internal certificate.',step2:'2 · Learn catalog and commissions',step2d:'Review solutions, plans and percentages before speaking with clients.',step3:'3 · Start selling',step3d:'Register client, service/product and amount directly in your dashboard.',start:'Start Academy',continue:'Continue training',presentation:'View initial presentation',catalog:'View catalog',status0:'Not started',status1:'In progress',status2:'Completed',module:'Module',progress:'Progress',certificate:'Certificate available'},
es:{tag:'EMPIEZA AQUÍ',title:'Tu recorrido como vendedor empieza aquí',text:'La Academia Comercial LDR es el primer paso. Después, usa el catálogo y las comisiones como apoyo y empieza a registrar ventas reales.',step1:'1 · Haz la formación inicial',step1d:'25 módulos prácticos, quizzes de aprendizaje y certificado interno.',step2:'2 · Conoce catálogo y comisiones',step2d:'Revisa soluciones, planes y porcentajes antes de hablar con el cliente.',step3:'3 · Empieza a vender',step3d:'Registra cliente, servicio/producto y valor directamente en el panel.',start:'Iniciar Academia',continue:'Continuar formación',presentation:'Ver presentación inicial',catalog:'Ver catálogo',status0:'No iniciado',status1:'En curso',status2:'Completado',module:'Módulo',progress:'Progreso',certificate:'Certificado disponible'}};
async function renderOnboarding(){
 const box=E('onboardingStart');if(!box)return;const q=ONBOARDING_COPY[lang]||ONBOARDING_COPY.pt;
 let a={started:false,current_module:1,completed_count:0,progress_percent:0,completed_at:null,certificate_code:null};
 if(token()){
   const r=await db.rpc('ldr_training_summary',{p_token:token()});
   if(!r.error&&r.data)a=r.data;
 }
 const done=!!a.completed_at;const started=!!a.started;const status=done?q.status2:started?q.status1:q.status0;
 const action=started&&!done?q.continue:q.start;
 box.innerHTML=`<div class="onboarding-status ${done?'done':''}">${q.tag} · ${status}</div><h2>${q.title}</h2><p>${q.text}</p><div class="start-steps"><div class="start-step"><b>${q.step1}</b><span>${q.step1d}</span></div><div class="start-step"><b>${q.step2}</b><span>${q.step2d}</span></div><div class="start-step"><b>${q.step3}</b><span>${q.step3d}</span></div></div><div class="academy-mini-progress"><i style="width:${Number(a.progress_percent)||0}%"></i></div><div class="academy-meta"><span>${q.progress}: <b>${Number(a.progress_percent)||0}%</b></span><span>${q.module}: <b>${Number(a.current_module)||1}/25</b></span>${a.certificate_code?`<span>✓ ${q.certificate}</span>`:''}</div><div class="onboarding-actions"><a class="btn gold" href="academia-vendas.html">${action}</a><a class="btn ghost" href="apresentacao-vendedores.html">${q.presentation}</a><a class="btn ghost" href="#catalogDash" onclick="document.getElementById('catalogDash').scrollIntoView({behavior:'smooth'})">${q.catalog}</a></div>`;
}
'''
pattern=r"const ONBOARDING_COPY=.*?window\.confirmOnboarding=confirmOnboarding;"
s2,n=re.subn(pattern,new_js,s,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'onboarding code replacement failed: {n}')
s=s2

# Ensure training summary refreshes each time the seller dashboard loads.
needle="E('payoutList').innerHTML=(data.payouts||[]).map"
if needle not in s:
    raise SystemExit('dashboard marker not found')
# Add refresh right before loadDashboard closes by replacing the known tail.
tail=".join('')||'<p class=\"small\">—</p>'}E('saleForm').addEventListener"
if tail in s:
    s=s.replace(tail,".join('')||'<p class=\"small\">—</p>';await renderOnboarding()}E('saleForm').addEventListener",1)
else:
    raise SystemExit('dashboard tail not found')

p.write_text(s,encoding='utf-8')
print('Seller Start Here integrated with Academy progress')
