from pathlib import Path
p=Path('rede-comercial-final/vendedor.html')
s=p.read_text(encoding='utf-8')
old='https://www.lucianoempreendendor.com/.netlify/functions/create-seller-checkout'
new='https://painel.ldrrhestrategia.com/api/seller-checkout'
if old not in s:
    raise SystemExit('old seller checkout endpoint not found')
s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
print('seller checkout endpoint switched to canonical panel backend')
