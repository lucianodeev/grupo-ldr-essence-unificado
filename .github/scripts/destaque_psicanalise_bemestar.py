from pathlib import Path

p = Path('site-publico-ldr/app/page.tsx')
text = p.read_text(encoding='utf-8')
marker = 'priority-services-public-20260831'
if marker in text:
    print('already applied')
    raise SystemExit(0)

priority = r'''
const priorityServices = {
  pt:{label:"SERVIÇOS EM DESTAQUE",title:"Cuidado humano e bem-estar para pessoas e empresas",psy:"1º · Psicanálise",psyText:"Atendimento individual e benefício corporativo. Sessão avulsa e pacotes de 4, 8 e 12 sessões. Para empresas: 4 sessões semanais, 4 sessões em frequência quinzenal ou 12 sessões por colaborador.",psyClient:"Contratar como cliente",psyCompany:"Oferecer aos funcionários",well:"2º · Massagem Laboral + Hora de Bem-Estar",wellText:"Ações de bem-estar para equipes com organização por colaborador, período ou ação corporativa.",wellCta:"Conhecer bem-estar corporativo"},
  en:{label:"FEATURED SERVICES",title:"Human care and wellbeing for people and companies",psy:"1st · Psychoanalysis",psyText:"Individual care and corporate benefit. Single session and packages of 4, 8 and 12 sessions. For companies: 4 weekly sessions, 4 sessions every two weeks or 12 sessions per employee.",psyClient:"Buy as an individual",psyCompany:"Offer to employees",well:"2nd · Workplace Massage + Wellbeing Hour",wellText:"Wellbeing actions for teams organized per employee, time block or corporate action.",wellCta:"Explore corporate wellbeing"},
  fr:{label:"SERVICES À LA UNE",title:"Accompagnement humain et bien-être pour personnes et entreprises",psy:"1er · Psychanalyse",psyText:"Accompagnement individuel et avantage entreprise. Séance unique et forfaits de 4, 8 et 12 séances. Pour les entreprises : 4 séances hebdomadaires, 4 séances toutes les deux semaines ou 12 séances par collaborateur.",psyClient:"Souscrire comme client",psyCompany:"Proposer aux collaborateurs",well:"2e · Massage en entreprise + Heure Bien-Être",wellText:"Actions de bien-être pour les équipes, organisées par collaborateur, durée ou action d'entreprise.",wellCta:"Découvrir le bien-être entreprise"},
  es:{label:"SERVICIOS DESTACADOS",title:"Cuidado humano y bienestar para personas y empresas",psy:"1º · Psicoanálisis",psyText:"Atención individual y beneficio corporativo. Sesión individual y paquetes de 4, 8 y 12 sesiones. Para empresas: 4 sesiones semanales, 4 sesiones quincenales o 12 sesiones por empleado.",psyClient:"Contratar como cliente",psyCompany:"Ofrecer a empleados",well:"2º · Masaje Laboral + Hora de Bienestar",wellText:"Acciones de bienestar para equipos organizadas por empleado, bloque de tiempo o acción corporativa.",wellCta:"Conocer bienestar corporativo"}
} as const;
// priority-services-public-20260831
'''
anchor = 'const paths = ["/rh", "/solucoes", "/mentoria", "/bem-estar"];'
if anchor not in text:
    raise SystemExit('paths anchor missing')
text = text.replace(anchor, priority + '\n' + anchor, 1)

old = '  const c = copy[lang];\n  const w = corporateCopy[lang];'
new = '  const c = copy[lang];\n  const w = corporateCopy[lang];\n  const priority = priorityServices[lang];'
if old not in text:
    raise SystemExit('copy anchor missing')
text = text.replace(old,new,1)

render_anchor = '    <section className="unifiedPopular">'
if render_anchor not in text:
    raise SystemExit('popular anchor missing')
section = r'''    <section className="unifiedPopular" id="servicos-destaque"><div className="unifiedTitle light"><span>{priority.label}</span><h2>{priority.title}</h2></div><div><article><small>01</small><h3>{priority.psy}</h3><p>{priority.psyText}</p><div className="ldrPriorityActions"><a href="https://painel.ldrrhestrategia.com/cliente/contratar">{priority.psyClient} →</a><a href="https://painel.ldrrhestrategia.com/empresa/login">{priority.psyCompany} →</a></div></article><article><small>02</small><h3>{priority.well}</h3><p>{priority.wellText}</p><a href={withLang("/bem-estar")}>{priority.wellCta} →</a></article></div></section>
'''
text = text.replace(render_anchor, section + render_anchor,1)
p.write_text(text,encoding='utf-8')
print('public priority applied')
