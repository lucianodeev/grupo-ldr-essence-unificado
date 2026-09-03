from pathlib import Path

p=Path('rede-comercial-final/vendedor.html')
s=p.read_text(encoding='utf-8')

hero_old='<div class="row"><a class="btn gold" href="#join" data-i="ctaJoin">Quero fazer parte</a><a class="btn ghost" href="#catalog" data-i="ctaKnow">Conhecer o que vou vender</a></div>'
hero_new='<div class="row hero-actions"><a class="btn gold" href="#join" data-i="ctaJoin">Quero fazer parte</a><a class="btn primary" href="#sellerLogin" data-i="already">Já sou vendedor</a><a class="btn ghost" href="#catalog" data-i="ctaKnow">Conhecer o que vou vender</a></div>'
if hero_old not in s:
    raise SystemExit('hero action block not found')
s=s.replace(hero_old,hero_new,1)

login_old='<div class="card"><h2 data-i="already">Já sou vendedor</h2><label>E-mail<input id="liEmail" type="email" class="field"></label>'
login_new='<div id="sellerLogin" class="card"><h2 data-i="already">Já sou vendedor</h2><label>E-mail<input id="liEmail" type="email" class="field"></label>'
if login_old not in s:
    raise SystemExit('seller login card not found')
s=s.replace(login_old,login_new,1)

css='''.hero-actions{align-items:stretch}.hero-actions .btn{min-width:155px}@media(max-width:560px){.hero-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}.hero-actions .btn{width:100%;min-width:0}.hero-actions .ghost{grid-column:1/-1}}#sellerLogin{scroll-margin-top:110px}'''
if css not in s:
    s=s.replace('</style>',css+'</style>',1)

p.write_text(s,encoding='utf-8')
print('existing seller CTA added')
