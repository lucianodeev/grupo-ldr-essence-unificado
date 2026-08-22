exports.handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify({
    error: 'Checkout movido para a Área do Cliente.',
    url: 'https://painel.ldrrhestrategia.com/cliente/biblioteca'
  })
});
