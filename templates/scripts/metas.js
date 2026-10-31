const formMeta = document.getElementById('formMeta')
const metaId = document.getElementById('metaId')
const titulo = document.getElementById('titulo')
const tipo = document.getElementById('tipo')
const valorAlvo = document.getElementById('valorAlvo')
const dataInicio = document.getElementById('dataInicio')
const dataFim = document.getElementById('dataFim')

const listaMetas = document.getElementById('listaMetas')
const mensagem = document.getElementById('mensagem')

const btnSalvar = document.getElementById('btnSalvar')
const btnCancelar = document.getElementById('btnCancelar')
const btnSair = document.getElementById('btnSair')

let metas = []

document.getElementById("dataAtual").textContent =
    new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

function mostrarMensagem(texto, classe) {
    mensagem.textContent = texto
    mensagem.className = `mensagem ${classe}`

    setTimeout(() => {
        mensagem.textContent = ''
        mensagem.className = 'mensagem'
    }, 4000)
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR', {
        timeZone: 'UTC'
    })
}

function obterDataInput(data) {
    return new Date(data).toISOString().slice(0, 10)
}

async function carregarMetas() {
    try {
        const resposta = await fetch('/metas')

        if (resposta.status === 401) {
            window.location.href = '/'
            return
        }

        if (!resposta.ok) {
            throw new Error('Não foi possível carregar as metas.')
        }

        metas = await resposta.json()

        atualizarResumo()
        renderizarMetas()
    } catch (erro) {
        console.error(erro)
        listaMetas.innerHTML = `
            <p class="mensagem-vazia">Erro ao carregar as metas.</p>
        `
    }
}

function atualizarResumo() {
    document.getElementById('totalMetas').textContent = metas.length

    document.getElementById('totalEconomia').textContent =
        metas.filter(meta => meta.tipo === 'economia').length

    document.getElementById('totalDespesas').textContent =
        metas.filter(meta => meta.tipo === 'despesa').length
}

function renderizarMetas() {
    if (metas.length === 0) {
        listaMetas.innerHTML = `
            <p class="mensagem-vazia">
                Você ainda não cadastrou nenhuma meta.
            </p>
        `
        return
    }

    listaMetas.innerHTML = metas.map(meta => {
        const percentual = Number(meta.percentual) || 0
        const largura = Math.min(percentual, 100)
        const excedido = meta.tipo === 'despesa' && percentual > 100

        const nomeTipo = meta.tipo === 'economia'
            ? 'Economia'
            : 'Limite de despesas'

        const nomeProgresso = meta.tipo === 'economia'
            ? 'Valor economizado'
            : 'Total de despesas'

        const nomeRestante = meta.tipo === 'economia'
            ? 'Falta economizar'
            : 'Valor restante'

        let textoRestante

        if (meta.tipo === 'economia' && meta.restante <= 0) {
            textoRestante = 'Meta alcançada!'
        } else if (meta.tipo === 'despesa' && meta.restante < 0) {
            textoRestante = `Limite excedido em ${formatarMoeda(Math.abs(meta.restante))}`
        } else {
            textoRestante = `${nomeRestante}: ${formatarMoeda(Math.max(0, meta.restante))}`
        }

        return `
            <article class="meta-card">
                <div class="meta-cabecalho">
                    <div>
                        <h3>${escaparHTML(meta.titulo)}</h3>
                        <span class="meta-tipo">${nomeTipo}</span>
                    </div>
                </div>

                <div class="meta-valor">
                    <span>${nomeProgresso}</span>
                    <strong>${formatarMoeda(meta.progresso)}</strong>
                </div>

                <div class="progresso-fundo">
                    <div
                        class="progresso-preenchido ${excedido ? 'excedido' : ''}"
                        style="width: ${largura}%"
                    ></div>
                </div>

                <div class="meta-percentual">
                    ${percentual.toFixed(1).replace('.', ',')}% do objetivo
                </div>

                <div class="meta-valor">
                    <span>Objetivo</span>
                    <strong>${formatarMoeda(meta.valorAlvo)}</strong>
                </div>

                <div class="meta-valor">
                    <span>${nomeRestante}</span>
                    <strong>${textoRestante}</strong>
                </div>

                <div class="meta-detalhes">
                    <span>Início: ${formatarData(meta.dataInicio)}</span>
                    <span>Fim: ${formatarData(meta.dataFim)}</span>
                </div>

                <div class="meta-acoes">
                    <button
                        type="button"
                        class="botao-acao botao-editar"
                        data-acao="editar"
                        data-id="${meta.id}"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        class="botao-acao botao-excluir"
                        data-acao="excluir"
                        data-id="${meta.id}"
                    >
                        Excluir
                    </button>
                </div>
            </article>
        `
    }).join('')
}

function escaparHTML(texto) {
    return String(texto).replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere])
}

function limparFormulario() {
    formMeta.reset()
    metaId.value = ''
    btnSalvar.textContent = 'Cadastrar meta'
    btnCancelar.hidden = true
    document.getElementById('tituloFormulario').textContent = 'Cadastrar nova meta'
}

function editarMeta(id) {
    const meta = metas.find(item => item.id === id)

    if (!meta) {
        return
    }

    metaId.value = meta.id
    titulo.value = meta.titulo
    tipo.value = meta.tipo
    valorAlvo.value = meta.valorAlvo
    dataInicio.value = obterDataInput(meta.dataInicio)
    dataFim.value = obterDataInput(meta.dataFim)

    btnSalvar.textContent = 'Salvar alterações'
    btnCancelar.hidden = false
    document.getElementById('tituloFormulario').textContent = 'Editar meta'

    formMeta.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    })
}

async function excluirMeta(id) {
    const confirmar = confirm('Deseja realmente excluir esta meta?')

    if (!confirmar) {
        return
    }

    try {
        const resposta = await fetch(`/metas/${id}`, {
            method: 'DELETE'
        })

        const dados = await resposta.json()

        if (!resposta.ok) {
            throw new Error(dados.mensagem || 'Erro ao excluir meta.')
        }

        mostrarMensagem(dados.mensagem, 'sucesso')
        await carregarMetas()
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro')
    }
}

formMeta.addEventListener('submit', async (evento) => {
    evento.preventDefault()

    if (dataInicio.value > dataFim.value) {
        mostrarMensagem(
            'A data inicial não pode ser posterior à data final.',
            'erro'
        )
        return
    }

    const dados = {
        titulo: titulo.value,
        tipo: tipo.value,
        valorAlvo: valorAlvo.value,
        dataInicio: dataInicio.value,
        dataFim: dataFim.value
    }

    const id = metaId.value
    const metodo = id ? 'PUT' : 'POST'
    const url = id ? `/metas/${id}` : '/metas'

    try {
        const resposta = await fetch(url, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        })

        const resultado = await resposta.json()

        if (!resposta.ok) {
            throw new Error(resultado.mensagem || 'Erro ao salvar meta.')
        }

        mostrarMensagem(
            id ? 'Meta atualizada com sucesso!' : 'Meta cadastrada com sucesso!',
            'sucesso'
        )

        limparFormulario()
        await carregarMetas()
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro')
    }
})

listaMetas.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-acao]')

    if (!botao) {
        return
    }

    const id = Number(botao.dataset.id)

    if (botao.dataset.acao === 'editar') {
        editarMeta(id)
    }

    if (botao.dataset.acao === 'excluir') {
        excluirMeta(id)
    }
})

btnCancelar.addEventListener('click', limparFormulario)

if (btnSair) {
    btnSair.addEventListener('click', async () => {
        try {
            await fetch('/auth/logout', {
                method: 'POST'
            })
        } finally {
            window.location.href = '/'
        }
    })
}

carregarMetas()