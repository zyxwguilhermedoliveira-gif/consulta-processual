/** ETAPA 3: Envio dos Leads para o Servidor Python Protegido */
async function submitThird(e) {
  e.preventDefault();
  if (busy) return;

  error('third-error', '');
  state.defendant = el('defendant').value.trim() || 'Não informado / Deixou em branco';
  
  busy = true;
  loading('finish-btn', 'finish-spin', 'finish-label', true, 'Processando...');

  try {
    // Comunicação direta com a nossa rota segura da Vercel
    const response = await fetch('/api/enviar-solicitacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: state.name || '',
        cpf: state.cpf || '',
        phone: state.phone || '',
        representation: state.representation || '',
        lawyer: state.lawyer || '',
        defendant: state.defendant || ''
      })
    });

    const result = await response.json();

    if (!response.ok || result.success !== true) {
      throw new Error(result.detail || 'Não foi possível concluir a transmissão dos dados.');
    }

    if (el('protocol')) el('protocol').hidden = true;
    showStep(4);

  } catch (err) {
    // Exibe o erro real retornado pelo servidor na linha vermelha
    error('third-error', err.message || 'Falha de comunicação. Tente novamente.');

  } finally {
    busy = false;
    loading('finish-btn', 'finish-spin', 'finish-label', false, 'Concluir e Liberar Relatório');
  }
}
