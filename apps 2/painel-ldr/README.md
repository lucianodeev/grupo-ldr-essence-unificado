# Empowered Professional Dashboard

Crie uma versão SEGURA e funcional do Painel Profissional — Sistema S8 da LDR RH & Estratégia, preservando integralmente o conteúdo funcional e a identidade visual vinho/dourado/creme do HTML legado abaixo. Objetivo principal: a rota /painel-profissional NÃO pode ser acessada por ninguém sem autenticação e autorização. Conhecer a URL nunca deve revelar o painel nem os dados.

REQUISITOS DE SEGURANÇA E ACESSO:
1) Usar Supabase Auth + PostgreSQL e Row Level Security (RLS). Não usar senha hardcoded no frontend e não considerar localStorage como proteção.
2) Criar /login com e-mail + senha, recuperação de senha e logout.
3) /painel-profissional deve exigir sessão válida E perfil autorizado. Perfis mínimos: superadmin e colaborador. Usuários não autenticados vão para /login. Usuários autenticados mas não autorizados recebem 403 e não conseguem consultar APIs/dados.
4) O superadmin consegue, dentro do painel, cadastrar/convidar colaboradores, ativar/desativar acesso e remover acesso. Cada pessoa deve usar sua própria conta; não compartilhar senha.
5) O primeiro superadmin deve ser criado por um fluxo de bootstrap de uso único protegido no SERVIDOR (não expor segredo no bundle). Depois de criado o primeiro superadmin, o bootstrap deve ficar permanentemente encerrado. Gere um segredo de bootstrap aleatório forte no backend e mostre-o apenas na resposta final do projeto para que o proprietário possa concluir o primeiro acesso. Se a infraestrutura não permitir segredo gerado automaticamente, implemente alternativa server-side segura equivalente, nunca segredo em JavaScript cliente.
6) Criar audit_logs para login, logout, criação/desativação de usuário e alterações relevantes do painel.
7) Dados do Sistema S8 devem sair do localStorage e ser persistidos no banco. Criar tabelas adequadas para participantes/clientes, sessões S8, projeto de negócio e PDE. RLS deve permitir leitura/escrita somente a usuários autorizados.
8) Não expor service_role ou outros segredos no frontend.
9) Proteção deve existir também no backend/APIs, não apenas esconder componentes de UI.
10) Sessão segura, mensagens de erro sem revelar dados e comportamento responsivo em iOS, Android e desktop.

FUNCIONALIDADES A PRESERVAR/IMPLEMENTAR:
- ficha do participante;
- progresso das 8 sessões;
- 8 sessões com escala 0–10, respostas principais, observações profissionais, tarefa e sessão concluída;
- cronômetro 50:00 por sessão;
- Projeto de Negócio com todos os campos do HTML legado;
- PDE com pontos fortes, competências, evolução e recomendações;
- gerar relatório final e imprimir/PDF;
- exportar dados JSON e importar JSON, mas somente para usuário autorizado;
- navegação Início/Formulário/Painel; se páginas públicas relacionadas não existirem, crie placeholders seguros sem quebrar links;
- área 'Gestão de Acessos' exclusiva do superadmin.

IMPORTANTE: esta aplicação trata dados potencialmente confidenciais. Não use dados reais de demonstração. Crie apenas estrutura vazia e, se necessário, dados fictícios claramente identificados.

HTML LEGADO A SER PRESERVADO COMO REFERÊNCIA FUNCIONAL E VISUAL:

<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel Profissional — Sistema S8</title><style>
:root{--wine:#68152f;--wine2:#3d0b1b;--gold:#c99b4b;--cream:#fff8e8;--paper:#fffdf7;--ink:#2d2024;--ok:#287a55;--line:#e8d7b8}
*{box-sizing:border-box} body{margin:0;font-family:Montserrat,Arial,sans-serif;background:var(--cream);color:var(--ink);line-height:1.55}
header{background:linear-gradient(135deg,var(--wine2),var(--wine));color:#fff;padding:22px;position:sticky;top:0;z-index:10;box-shadow:0 4px 18px #0003}
.wrap{max-width:1160px;margin:auto;padding:20px}.brand{font-family:Georgia,serif;font-size:1.45rem}.sub{opacity:.85;font-size:.9rem}
nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}a.btn,button{border:0;border-radius:10px;padding:11px 16px;cursor:pointer;font-weight:700;text-decoration:none;display:inline-block}
.btn-gold,button{background:var(--gold);color:#271605}.btn-light{background:#fff;color:var(--wine)}.btn-wine{background:var(--wine);color:#fff}
.card{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:22px;margin:16px 0;box-shadow:0 8px 24px #5a27300d}
h1,h2,h3{font-family:Georgia,serif;color:var(--wine)} header h1,header h2{color:#fff}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
label{display:block;font-weight:700;margin:12px 0 6px}input,select,textarea{width:100%;padding:12px;border:1px solid #cdbb9c;border-radius:10px;background:#fff;font:inherit}textarea{min-height:100px}
fieldset{border:1px solid var(--line);border-radius:14px;margin:16px 0;padding:16px}legend{font-weight:800;color:var(--wine)}
.options label{font-weight:500;display:flex;align-items:center;gap:8px;padding:6px}.options input{width:auto}.notice{border-left:5px solid var(--gold);background:#fff5dc;padding:14px;border-radius:9px}.success{border-left-color:var(--ok);background:#ecfff5}
.progress{height:14px;background:#eadfc8;border-radius:9px;overflow:hidden}.progress>div{height:100%;background:var(--gold);width:0}.session{border-left:5px solid var(--wine)}
.timer{font-size:2.2rem;font-weight:900;text-align:center;letter-spacing:2px;color:var(--wine)}.actions{display:flex;gap:8px;flex-wrap:wrap}.hidden{display:none!important}
.badge{display:inline-block;background:#f1dfb9;color:#5a3510;border-radius:999px;padding:5px 10px;font-size:.8rem;font-weight:800}.small{font-size:.88rem;color:#655}
.report{white-space:pre-wrap;background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px}.topline{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
@media(max-width:760px){.grid{grid-template-columns:1fr}.wrap{padding:12px}header{position:relative}.card{padding:16px}.timer{font-size:1.8rem}}
@media print{header,.no-print,button,a.btn{display:none!important}body{background:#fff}.card{box-shadow:none;border:0}.wrap{max-width:none}}
</style></head><body><header><div class="wrap"><div class="brand">Painel Profissional — Sistema S8/Mentoria</div><div class="sub">8 sessões individuais • 50 minutos • PDE final</div></div></header><main class="wrap">
<section class="card"><h1>Ficha do participante</h1></section>
<!-- Manter a implementação completa das 8 sessões com os títulos: 1 Origem, momento atual e objetivo; 2 Perfil comportamental empreendedor; 3 Problema, oportunidade e público; 4 Solução, proposta de valor e diferenciais; 5 Modelo, preço e viabilidade; 6 Comunicação, vendas e validação; 7 Operação e plano de execução; 8 Consolidação e PDE final. -->
<!-- Manter todos os campos de Projeto de Negócio: nome, apresentação da ideia, problema, solução, público-alvo, produto/serviço, proposta de valor/diferenciais, canais, vendas, preço, custos, receitas, parceiros/recursos, riscos/respostas, metas/indicadores, plano 30/60/90. -->
<!-- Manter PDE: pontos fortes, competências a desenvolver, evolução, recomendações. -->
</main></body></html>

Ao finalizar, valide que: (a) abrir /painel-profissional anonimamente redireciona para /login; (b) chamadas ao banco de um usuário não autorizado falham por RLS; (c) colaborador não acessa Gestão de Acessos; (d) superadmin acessa gestão; (e) logout bloqueia imediatamente o painel; (f) build sem erros.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ldr-painel-profissional-seguro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/70d2355e-0a84-4847-9b82-901810f65895).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
