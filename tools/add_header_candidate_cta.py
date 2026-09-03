from pathlib import Path

p=Path('rede-comercial-final/vendedor.html')
s=p.read_text(encoding='utf-8')

if 'class="header-apply"' not in s:
    css='''.header-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.header-apply{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:10px 15px;border-radius:999px;background:var(--g);color:#17212b;text-decoration:none;font-weight:900;white-space:nowrap;box-shadow:0 3px 12px #0002}.header-apply:hover{filter:brightness(1.04)}.header-apply:focus-visible{outline:3px solid #fff;outline-offset:2px}@media(max-width:800px){.header-actions{width:100%;display:grid;grid-template-columns:1fr}.header-apply{width:100%;min-height:48px;font-size:15px;order:-1}.langs{width:100%}.langs button{min-height:42px}}'''
    if '</style>' not in s:
        raise SystemExit('style tag not found')
    s=s.replace('</style>',css+'</style>',1)

    old='<div class="langs"><button data-lang="pt">PT</button><button data-lang="fr">FR</button><button data-lang="en">EN</button><button data-lang="es">ES</button></div></div></header>'
    new='<div class="header-actions"><a class="header-apply" href="#join" data-i="ctaJoin" aria-label="Ir para o formulário de candidatura">CANDIDATE-SE</a><div class="langs"><button data-lang="pt">PT</button><button data-lang="fr">FR</button><button data-lang="en">EN</button><button data-lang="es">ES</button></div></div></div></header>'
    if old not in s:
        raise SystemExit('header language block not found')
    s=s.replace(old,new,1)

    p.write_text(s,encoding='utf-8')

print('header candidate CTA applied')
