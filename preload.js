const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  abrirDialogoImagem: () => ipcRenderer.invoke('abrir-dialogo-imagem'),
  salvarImagem: (data) => ipcRenderer.invoke('salvar-imagem', data),
  listarImagens: () => ipcRenderer.invoke('listar-imagens'),
  buscarImagemPorIndice: (indice) => ipcRenderer.invoke('buscar-imagem-por-indice', indice),
  deletarImagem: (id) => ipcRenderer.invoke('deletar-imagem', id),
  abrirTelao: () => ipcRenderer.send('abrir-telao'),
  alternarFullscreen: () => ipcRenderer.send('alternar-fullscreen'),
  atualizarImagem: (id, dados) => ipcRenderer.invoke('atualizar-imagem', id, dados),
  apagarTodasImagens: () => ipcRenderer.invoke('apagar-todas-imagens'),
  abrirHome: () => ipcRenderer.send('abrir-home'),

  enviarIndiceSelecionado: (indice, tipo = 'divulgacao') =>
    ipcRenderer.send('atualizar-imagem', { indice, tipo }),

  // listeners
  onAtualizarImagem: (callback) =>
    ipcRenderer.on('atualizar-imagem', (event, data) => {
      callback(data.indice, data.tipo);
    }),

  limparTelao: () => ipcRenderer.send('limparTelao'),
  onLimparTelao: (callback) => ipcRenderer.on('limparImagem', callback),

  verificarTelaoAberto: () => ipcRenderer.invoke('verificar-telao-aberto'),
});
