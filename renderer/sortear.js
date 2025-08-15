window.addEventListener('DOMContentLoaded', async () => {
    const lista = document.getElementById('lista');
    const btnSortear = document.getElementById('btnSortear');
    const inputSortear = document.getElementById('inputSortear');
    const template = document.getElementById('template-imagem-card');
    const btnAbrirTelao = document.getElementById('btnAbrirTelao');
    const btnLimparTelao = document.getElementById('btnLimparTelao');
    const btnDivulgar = document.getElementById('btnDivulgar');

    let imagens = [];
    let divulgacaoInterval = null;
    let divulgacaoLista = [];

    async function atualizarLista() {
        imagens = await window.api.listarImagens();
        lista.innerHTML = '';
        imagens.forEach(({ id, indice, caminho }) => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.imagem-card');
            card.querySelector('.imagem-indice').textContent = indice;
            card.querySelector('.imagem-preview').src = caminho;
            lista.appendChild(clone);
        });
    }

    document.getElementById('btnVoltarHome').onclick = () => {
        window.location.href = 'home.html';
    };

    // --- Abrir Telão ---
    btnAbrirTelao.onclick = () => window.api.abrirTelao();

    // --- Parar divulgação ---
    async function pararDivulgacao() {
        if (divulgacaoInterval) {
            clearInterval(divulgacaoInterval);
            divulgacaoInterval = null;
            btnDivulgar.textContent = "Divulgar Items do Sorteio";
        }
        limparDestaquesDivulgacao();
    }

    // --- Limpar Telão ---
    btnLimparTelao.onclick = () => {
        window.api.limparTelao();
        pararDivulgacao();

        lista.querySelectorAll('.imagem-card.destacado-azul')
            .forEach(c => c.classList.remove('destacado-azul'));
        inputSortear.value = '';
    };
    // --- Sorteio manual ---
    function sortearIndice() {
        const indiceDigitado = parseInt(inputSortear.value);
        if (!isNaN(indiceDigitado)) {
            const item = imagens.find(i => i.indice === indiceDigitado);
            if (item) {
                window.api.abrirTelao();
                window.api.enviarIndiceSelecionado(indiceDigitado, 'sorteio'); // <- tipo sorteio
                pararDivulgacao();
            } else {
                mostrarMensagem('Índice digitado não existe na lista.', 'erro');
            }
        }
        inputSortear.value = '';
        inputSortear.focus();
        limparDestaquesDivulgacao();
    }

    btnSortear.onclick = sortearIndice;
    inputSortear.addEventListener('keydown', e => {
        if (e.key === 'Enter') sortearIndice();
    });

    // --- Seleção na lista enquanto digita ---
    inputSortear.addEventListener('input', () => {
        const valor = parseInt(inputSortear.value);
        const cards = lista.querySelectorAll('.imagem-card');

        // limpa destaque anterior
        cards.forEach(c => c.classList.remove('destacado-azul'));

        if (!isNaN(valor)) {
            const card = [...cards].find(c => parseInt(c.querySelector('.imagem-indice').textContent) === valor);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.classList.add('destacado-azul');
            }
        }
    });

    // --- Divulgação automática ---
    btnDivulgar.onclick = async () => {
        if (divulgacaoInterval) {
            pararDivulgacao();
            window.api.limparTelao();
            return;
        }

        window.api.abrirTelao();
        divulgacaoLista = [...imagens];
        btnDivulgar.textContent = "Parar Divulgação";

        // exibir primeiro item imediatamente
        if (divulgacaoLista.length > 0) {
            const randomIdx = Math.floor(Math.random() * divulgacaoLista.length);
            const item = divulgacaoLista.splice(randomIdx, 1)[0];
            window.api.enviarIndiceSelecionado(item.indice, 'divulgacao');

            // aplica destaque azul
            const card = [...lista.querySelectorAll('.imagem-card')]
                .find(c => parseInt(c.querySelector('.imagem-indice').textContent) === item.indice);
            if (card) card.classList.add('destacado-divulgacao');
        }

        divulgacaoInterval = setInterval(async () => {
            const aberto = await window.api.verificarTelaoAberto?.();
            if (!aberto) {
                pararDivulgacao();
                return;
            }

            if (divulgacaoLista.length === 0) {
                divulgacaoLista = [...imagens];
            }

            const randomIdx = Math.floor(Math.random() * divulgacaoLista.length);
            const item = divulgacaoLista.splice(randomIdx, 1)[0];
            window.api.enviarIndiceSelecionado(item.indice, 'divulgacao');

            // remove apenas destaque de divulgação anterior
            lista.querySelectorAll('.imagem-card.destacado-divulgacao')
                .forEach(c => c.classList.remove('destacado-divulgacao'));

            // aplica destaque de divulgação no item atual
            const card = [...lista.querySelectorAll('.imagem-card')]
                .find(c => parseInt(c.querySelector('.imagem-indice').textContent) === item.indice);
            if (card) card.classList.add('destacado-divulgacao');

        }, 8000);
    };

    function mostrarMensagem(texto, tipo = 'info', duracao = 5000) {
        const div = document.createElement('div');
        div.className = 'mensagem';
        div.textContent = texto;
        div.style.background = tipo === 'erro' ? '#fdd' : '#fffae6';
        div.style.borderColor = tipo === 'erro' ? '#f99' : '#ccc';
        document.body.appendChild(div);

        div.style.display = 'block';
        div.style.opacity = '0';
        setTimeout(() => div.style.opacity = '1', 50);
        setTimeout(() => {
            div.style.opacity = '0';
            setTimeout(() => div.remove(), 300);
        }, duracao);
    }

    function limparDestaquesDivulgacao() {
        lista.querySelectorAll('.imagem-card.destacado-divulgacao')
            .forEach(c => c.classList.remove('destacado-divulgacao'));
    }

    await atualizarLista();
});
