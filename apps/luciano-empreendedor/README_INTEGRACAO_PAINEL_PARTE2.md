# Integração com o Painel LDR — Parte 2

O site público agora usa o Painel do Cliente como único fluxo de biblioteca e compra:

- Plataforma → `https://painel.ldrrhestrategia.com/cliente/login`
- Biblioteca/leitor legado → `https://painel.ldrrhestrategia.com/cliente/biblioteca`
- Checkout antigo do site público foi desativado (HTTP 410).
- Verificação antiga de compra foi desativada (HTTP 410).
- Botão público de TESTE removido.
- Área admin legada permanece oculta; o host administrativo é encaminhado ao painel profissional.

A cobrança, webhook, pedidos e liberação de acesso passam a ser responsabilidade do projeto do painel LDR.
