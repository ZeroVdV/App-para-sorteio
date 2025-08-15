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

    // ---------- NOVAS VARIÁVEIS DE ESTADO ----------
    let telãoAberto = false;
    let tipoAtual = null; // 'sorteio' | 'divulgacao' | null
    let indiceAtual = null;

    // ---------- FUNÇÃO AUXILIAR: ABRIR TELÃO E AGUARDAR ----------
    async function abrirTelaoEAguardar() {
        await window.api.abrirTelao();
        const aberto = await aguardarTelaoAberto();
        if (aberto) telãoAberto = true;
        return aberto;
    }

    async function aguardarTelaoAberto(timeout = 5000, intervalo = 100) {
        const inicio = Date.now();
        while (Date.now() - inicio < timeout) {
            const aberto = await window.api.verificarTelaoAberto?.();
            if (aberto) return true;
            await new Promise(r => setTimeout(r, intervalo));
        }
        return false; // timeout
    }

    // ---------- FUNÇÃO ATUALIZAR LISTA ----------
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

    // ---------- ABRIR TELÃO MANUAL ----------
    btnAbrirTelao.onclick = async () => {
        const aberto = await abrirTelaoEAguardar();
        if (!aberto) mostrarMensagem('Não foi possível abrir o telão.', 'erro');
    };

    // ---------- PARAR DIVULGAÇÃO ----------
    async function pararDivulgacao() {
        if (divulgacaoInterval) {
            clearInterval(divulgacaoInterval);
            divulgacaoInterval = null;
            btnDivulgar.textContent = "Divulgar Items do Sorteio";
        }
        limparDestaquesDivulgacao();
        tipoAtual = null;
    }

    // ---------- LIMPAR TELÃO ----------
    btnLimparTelao.onclick = () => {
        if (tipoAtual === 'divulgacao') {
            // Apagar sem animação no índice
            window.api.limparTelao();
        } else if (tipoAtual === 'sorteio') {
            // Mantém animação de saída no índice
            window.api.limparTelao();
        }

        pararDivulgacao();
        indiceAtual = null;
        tipoAtual = null;

        // Limpa destaques da lista
        lista.querySelectorAll('.imagem-card.destacado-azul, .imagem-card.destacado-divulgacao')
            .forEach(c => c.classList.remove('destacado-azul', 'destacado-divulgacao'));

        inputSortear.value = '';
    };

    // ---------- SORTEIO MANUAL ----------
    async function sortearIndice() {
        const indiceDigitado = parseInt(inputSortear.value);
        if (!isNaN(indiceDigitado)) {
            const item = imagens.find(i => i.indice === indiceDigitado);
            if (item) {
                const aberto = await abrirTelaoEAguardar();
                if (!aberto) {
                    mostrarMensagem('Não foi possível abrir o telão.', 'erro');
                    return;
                }

                window.api.enviarIndiceSelecionado(indiceDigitado, 'sorteio');
                pararDivulgacao();

                tipoAtual = 'sorteio';
                indiceAtual = indiceDigitado;
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

    // ---------- SELEÇÃO NA LISTA ENQUANTO DIGITA ----------
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

    // ---------- DIVULGAÇÃO AUTOMÁTICA ----------
    btnDivulgar.onclick = async () => {
        if (divulgacaoInterval) {
            pararDivulgacao();
            window.api.limparTelao();
            return;
        }

        const aberto = await abrirTelaoEAguardar();
        if (!aberto) {
            mostrarMensagem('Não foi possível abrir o telão.', 'erro');
            return;
        }

        tipoAtual = 'divulgacao';
        divulgacaoLista = [...imagens];
        btnDivulgar.textContent = "Parar Divulgação";

        // exibir primeiro item imediatamente
        if (divulgacaoLista.length > 0) {
            const randomIdx = Math.floor(Math.random() * divulgacaoLista.length);
            const item = divulgacaoLista.splice(randomIdx, 1)[0];
            window.api.enviarIndiceSelecionado(item.indice, 'divulgacao');
            indiceAtual = item.indice;

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

            if (divulgacaoLista.length === 0) divulgacaoLista = [...imagens];

            const randomIdx = Math.floor(Math.random() * divulgacaoLista.length);
            const item = divulgacaoLista.splice(randomIdx, 1)[0];
            window.api.enviarIndiceSelecionado(item.indice, 'divulgacao');
            indiceAtual = item.indice;

            // remove apenas destaque de divulgação anterior
            lista.querySelectorAll('.imagem-card.destacado-divulgacao')
                .forEach(c => c.classList.remove('destacado-divulgacao'));

            // aplica destaque de divulgação no item atual
            const card = [...lista.querySelectorAll('.imagem-card')]
                .find(c => parseInt(c.querySelector('.imagem-indice').textContent) === item.indice);
            if (card) card.classList.add('destacado-divulgacao');

        }, 8000);
    };

    // ---------- MENSAGENS ----------
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
