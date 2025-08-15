const img = document.getElementById('imagem');
//const indiceTelao = document.getElementById('indiceTelao');
const btnFullscreen = document.getElementById('btnFullscreen');
const iconeFullscreen = document.getElementById('iconeFullscreen');

let emFullscreen = false;

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

async function exibirImagem(result, indice, tipo = 'divulgacao') {
  if (!result || !result.caminho) return;

  // Pré-carrega a nova imagem
  const novaImg = new Image();
  novaImg.src = result.caminho;

  novaImg.onload = () => {
    // Reset visual do img
    img.style.display = 'block';
    img.classList.remove('zoom', 'sorteio', 'zoomOut');

    // Reset visual do índice
    /*
    indiceTelao.classList.remove('indiceZoom', 'indiceZoomOut');
    indiceTelao.style.opacity = 0;
    */

    // Força reflow antes de aplicar nova animação
    void img.offsetWidth;
    //void indiceTelao.offsetWidth;

    // Atualiza imagem
    img.src = result.caminho;
    img.classList.add('zoom');
    if (tipo === 'sorteio') img.classList.add('sorteio');
    img.style.opacity = tipo === 'sorteio' ? 0.85 : 1;

    // Atualiza índice com animação
    // Atualiza índice com animação
    if (tipo === 'sorteio') {
      /*
      indiceTelao.textContent = indice;
      indiceTelao.classList.add('indiceZoom');
      indiceTelao.style.opacity = 1;
      */
    } else {

      // Divulgação: garante que o índice está vazio e sem classes
      /*
      indiceTelao.textContent = '';
      indiceTelao.classList.remove('indiceZoom', 'indiceZoomOut');
      indiceTelao.style.opacity = 0;
      */
    }
  };
}
window.api.onAtualizarImagem(async (indiceStr, tipo = 'divulgacao') => {
  const indice = parseInt(indiceStr);
  if (isNaN(indice) || indice <= 0) return;
  const result = await window.api.buscarImagemPorIndice(indice);
  exibirImagem(result, indice, tipo);
});

window.api.onLimparTelao(() => {
  img.dataset.limpa = 'true';

  img.classList.remove('zoom', 'sorteio');
  img.classList.add('zoomOut');
  /*
  indiceTelao.classList.remove('indiceZoom');
  indiceTelao.classList.add('indiceZoomOut');
  */

  setTimeout(() => {
    img.style.opacity = 0;
    /*
    indiceTelao.style.opacity = 0;
    indiceTelao.textContent = '';
    */
    img.classList.remove('zoomOut', 'sorteio');
    //indiceTelao.classList.remove('indiceZoomOut', 'indiceZoom');

    img.dataset.limpa = 'true';
  }, 500);
});