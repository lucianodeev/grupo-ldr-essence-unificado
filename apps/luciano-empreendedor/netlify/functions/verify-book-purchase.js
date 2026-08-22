exports.handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify({
    verified: false,
    error: 'A verificação de compras agora é feita no Painel do Cliente via webhook Stripe.'
  })
});
