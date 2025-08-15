const img = document.getElementById('imagem');
const indiceTelao = document.getElementById('indiceTelao');
const btnFullscreen = document.getElementById('btnFullscreen');
const iconeFullscreen = document.getElementById('iconeFullscreen');

let emFullscreen = false;

// Estado global do telão
let estadoTelao = {
  imagemAtual: null,   // caminho da imagem exibida
  indiceAtual: null,   // índice exibido
  tipo: null,          // 'sorteio' ou 'divulgacao'
  visivel: false       // se a tela está visível
};

// Inicialmente tudo oculto
img.classList.add('oculto');
indiceTelao.classList.add('oculto');

// --- Fullscreen ---
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
      .then(() => { emFullscreen = true; iconeFullscreen.src = "../Icones/minimizar.png"; })
      .catch(err => console.error(err));
  } else {
    document.exitFullscreen()
      .then(() => { emFullscreen = false; iconeFullscreen.src = "../Icones/tela-cheia.png"; })
      .catch(err => console.error(err));
  }
}

btnFullscreen.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  emFullscreen = !!document.fullscreenElement;
  iconeFullscreen.src = emFullscreen ? "../Icones/minimizar.png" : "../Icones/tela-cheia.png";
});

// --- Exibir imagem ---
async function exibirImagem(result, indice, tipo = 'divulgacao') {
  if (!result || !result.caminho) {
    ocultarTelao();
    return;
  }

  const novaImg = new Image();
  novaImg.src = result.caminho;

  novaImg.onload = () => {
    // Remove oculto
    img.classList.remove('oculto');
    indiceTelao.classList.remove('oculto');

    // Reset visual
    img.style.display = 'block';
    img.classList.remove('zoom', 'sorteio', 'zoomOut');
    indiceTelao.classList.remove('indiceZoom', 'indiceZoomOut');
    indiceTelao.style.opacity = 0;

    void img.offsetWidth; // força reflow

    // Atualiza imagem
    img.src = result.caminho;
    img.classList.add('zoom');
    if (tipo === 'sorteio') img.classList.add('sorteio');
    img.style.opacity = tipo === 'sorteio' ? 0.85 : 1;

    // Atualiza índice
    if (tipo === 'sorteio') {
      indiceTelao.textContent = indice;
      indiceTelao.classList.add('indiceZoom');
      indiceTelao.style.opacity = 1;
    } else {
      indiceTelao.textContent = '';
      indiceTelao.style.opacity = 0;
      indiceTelao.classList.remove('indiceZoom', 'indiceZoomOut');
    }

    // Atualiza estado global
    estadoTelao = {
      imagemAtual: result.caminho,
      indiceAtual: indice,
      tipo: tipo,
      visivel: true
    };
  };
}

// --- Atualização via API ---
window.api.onAtualizarImagem(async (indiceStr, tipo = 'divulgacao') => {
  const indice = parseInt(indiceStr);
  if (isNaN(indice) || indice <= 0) return;
  const result = await window.api.buscarImagemPorIndice(indice);
  exibirImagem(result, indice, tipo);
});

// --- Ocultar telão ---
function ocultarTelao() {
  img.dataset.limpa = 'true';

  // Remove classes de entrada
  img.classList.remove('zoom', 'sorteio');
  indiceTelao.classList.remove('indiceZoom', 'indiceZoomOut');

  if (!img.classList.contains('oculto')) {
    img.classList.add('zoomOut');
  }

  if (estadoTelao.tipo === 'sorteio') {
    // Sorteio: anima índice
    indiceTelao.classList.add('indiceZoomOut');
  } else {
    // Divulgação: índice desaparece instantaneamente
    indiceTelao.style.opacity = 0;
    indiceTelao.textContent = '';
    indiceTelao.classList.add('oculto');
  }

  setTimeout(() => {
    // Limpa classes e estilos
    img.classList.remove('zoomOut', 'sorteio');
    indiceTelao.classList.remove('indiceZoom', 'indiceZoomOut');
    img.style.opacity = 0;

    // Oculta tudo
    img.classList.add('oculto');
    indiceTelao.classList.add('oculto');

    img.dataset.limpa = 'true';

    // Reset estado global
    estadoTelao = { imagemAtual: null, indiceAtual: null, tipo: null, visivel: false };
  }, 500);
}

// --- Limpar telão via API ---
window.api.onLimparTelao(() => {
  ocultarTelao();
});
