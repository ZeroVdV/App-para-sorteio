window.addEventListener('DOMContentLoaded', async () => {
    const indiceInput = document.getElementById('indice');
    const btnSelecionar = document.getElementById('selecionarImagem');
    const btnSalvar = document.getElementById('salvar');
    const lista = document.getElementById('lista');
    const preview = document.getElementById('preview');
    const btnUp = document.getElementById('btnUp');
    const btnDown = document.getElementById('btnDown');
    const btnCancelar = document.getElementById('cancelar');

    let caminhoImagem = null;
    let indicesExistentes = [];
    let cardsMap = new Map();
    let editando = false;
    let idEditando = null;
    let indiceEditando = null;

    document.getElementById('btnVoltarHome').onclick = () => {
        window.location.href = 'home.html';
    };

    async function atualizarLista() {
        const imagens = await window.api.listarImagens();

        // Atualiza indices e limpa map antigo
        indicesExistentes = imagens.map(img => img.indice).sort((a, b) => a - b);
        cardsMap.clear();

        lista.innerHTML = ''; // Limpa lista para repovoar
        const template = document.getElementById('template-imagem-card');

        imagens.forEach(({ id, indice, caminho }) => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.imagem-card');

            card.dataset.indice = indice;
            card.querySelector('.imagem-indice').textContent = indice;
            card.querySelector('.imagem-preview').src = caminho;

            card.querySelector('.btn-editar').onclick = () => editar(id, indice, caminho);
            card.querySelector('.btn-apagar').onclick = () => deletar(id);

            lista.appendChild(clone);

            const cardEl = lista.lastElementChild;
            cardsMap.set(indice, cardEl);
        });

        if (!editando) sugerirProximoIndice();
    }

    function sugerirProximoIndice() {
        let i = 1;
        while (indicesExistentes.includes(i)) i++;
        indiceInput.value = i;
    }

    function limparDestaques() {
        cardsMap.forEach(card => card.classList.remove('destacado-vermelho'));
    }

    function verificarIndiceOcupado() {
        limparDestaques();
        const val = parseInt(indiceInput.value);
        if (!isNaN(val) && indicesExistentes.includes(val) && (!editando || val !== indiceEditando)) {
            const card = cardsMap.get(val);
            if (card) {
                card.classList.add('destacado-vermelho');
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    indiceInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') verificarIndiceOcupado(); });
    indiceInput.addEventListener('blur', verificarIndiceOcupado);

    btnUp.onclick = () => {
        let atual = parseInt(indiceInput.value) || 0;
        do { atual++; } while (indicesExistentes.includes(atual) && (!editando || atual !== indiceEditando));
        indiceInput.value = atual;
        limparDestaques();
    };

    btnDown.onclick = () => {
        let atual = parseInt(indiceInput.value) || 1;
        do { atual--; } while (atual > 0 && indicesExistentes.includes(atual) && (!editando || atual !== indiceEditando));
        if (atual > 0) {
            indiceInput.value = atual;
            limparDestaques();
        }
    };

    btnSelecionar.onclick = async () => {
        caminhoImagem = await window.api.abrirDialogoImagem();
        if (caminhoImagem) {
            preview.src = caminhoImagem;
            preview.style.display = 'block';
        }
    };

    btnSalvar.onclick = async () => {
        const indice = parseInt(indiceInput.value);
        if (!indice) return mostrarMensagem('⚠ Informe um número para o sorteio.');

        if (indicesExistentes.includes(indice) && (!editando || indice !== indiceEditando)) {
            const card = cardsMap.get(indice);
            if (card) {
                card.classList.add('destacado-vermelho');
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return mostrarMensagem(`⚠ O número ${indice} já existe.`);
        }

        if (!caminhoImagem && !editando) return mostrarMensagem('⚠ Escolha uma imagem para o item.');
        if (editando && !caminhoImagem) caminhoImagem = preview.src || null;
        if (editando && !caminhoImagem) return mostrarMensagem('⚠ Escolha uma imagem para o item.');

        try {
            if (editando) {
                await window.api.atualizarImagem(idEditando, { indice, caminho: caminhoImagem });
                finalizarEdicao();
            } else {
                await window.api.salvarImagem({ indice, caminho: caminhoImagem });
            }
        } catch (err) {
            mostrarMensagem('❌ Erro ao salvar: ' + err.message);
        }

        caminhoImagem = null;
        preview.style.display = 'none';
        await atualizarLista();
    };

    window.editar = (id, indiceAtual, caminhoAtual) => {
        editando = true;
        idEditando = id;
        indiceEditando = indiceAtual;
        indiceInput.value = indiceAtual;
        caminhoImagem = caminhoAtual;

        preview.src = caminhoAtual;
        preview.style.display = 'block';

        btnSalvar.textContent = 'Atualizar Item';
        btnCancelar.style.display = 'inline-block';
    };

    btnCancelar.onclick = finalizarEdicao;

    window.deletar = async (id) => {
        confirmarAcao(
            'Tem certeza que deseja excluir este item?',
            async () => {
                await window.api.deletarImagem(id);
                if (editando && idEditando === id) finalizarEdicao();
                await atualizarLista();
            },
            () => { }
        );
    };

    function finalizarEdicao() {
        editando = false;
        idEditando = null;
        indiceEditando = null;
        caminhoImagem = null;

        indiceInput.value = '';
        btnSalvar.textContent = 'Salvar Item';
        btnCancelar.style.display = 'none';
        preview.src = '';
        preview.style.display = 'none';

        sugerirProximoIndice();
        limparDestaques();
    }

    await atualizarLista();

    document.getElementById('apagarTodos').onclick = () => {
        const modal = document.getElementById('modalConfirmacaoRobusto');
        modal.style.display = 'flex';
        document.getElementById('confirmarTexto').value = '';
        document.getElementById('confirmarApagar').disabled = true;
    };

    document.getElementById('cancelarModalRobusto').onclick = () => {
        document.getElementById('modalConfirmacaoRobusto').style.display = 'none';
    };

    document.getElementById('confirmarTexto').addEventListener('input', (e) => {
        const btn = document.getElementById('confirmarApagar');
        btn.disabled = (e.target.value.trim().toLowerCase() !== 'excluir');
    });

    document.getElementById('confirmarApagar').onclick = async () => {
        await window.api.apagarTodasImagens();
        finalizarEdicao();
        document.getElementById('modalConfirmacaoRobusto').style.display = 'none';
        await atualizarLista();
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

    function confirmarAcao(texto, callbackOk, callbackCancel) {
        const modal = document.getElementById('modalConfirmacaoSimples');
        const textoModal = document.getElementById('textoConfirmacao');
        const btnOk = document.getElementById('btnConfirmarModal');
        const btnCancelar = document.getElementById('btnCancelarModal');

        textoModal.textContent = texto;
        modal.style.display = 'flex';

        const limpar = () => {
            btnOk.onclick = null;
            btnCancelar.onclick = null;
            modal.style.display = 'none';
        };

        btnOk.onclick = () => { limpar(); if (callbackOk) callbackOk(); };
        btnCancelar.onclick = () => { limpar(); if (callbackCancel) callbackCancel(); };
    }
});
