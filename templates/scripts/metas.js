
const formMeta = document.getElementById('formMeta')
const metaId = document.getElementById('metaId')
const titulo = document.getElementById('titulo')
const tipo = document.getElementById('tipo')
const valorAlvo = document.getElementById('valorAlvo')
const dataInicio = document.getElementById('dataInicio')
const dataFim = document.getElementById('dataFim')
const caixaId = document.getElementById('caixaId')
const listaMetas = document.getElementById('listaMetas')
const mensagem = document.getElementById('mensagem')
const btnSalvar = document.getElementById('btnSalvar')
const btnCancelar = document.getElementById('btnCancelar')
const modalMeta = document.getElementById('modalMeta')
const ajudaCaixa = document.getElementById('ajudaCaixa')

let metas = []
let caixas = []

const elementoDataAtual = document.getElementById('dataAtual')

if (elementoDataAtual) {
    elementoDataAtual.textContent = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })
}

function mostrarMensagem(texto, classe = '') {
    mensagem.textContent = texto
    mensagem.className = `mensagem ${classe}`

    if (texto) {
        setTimeout(() => {
            mensagem.textContent = ''
            mensagem.className = 'mensagem'
        }, 4000)
    }
}


let temporizadorNotificacaoTopo

function mostrarNotificacaoTopo(texto, tipo = 'sucesso') {
    let notificacao = document.getElementById('notificacaoTopoMetas')

    if (!notificacao) {
        notificacao = document.createElement('div')
        notificacao.id = 'notificacaoTopoMetas'
        notificacao.setAttribute('role', 'status')
        notificacao.setAttribute('aria-live', 'polite')
        document.body.appendChild(notificacao)
    }

    notificacao.textContent = texto
    notificacao.className = `notificacao-topo-metas ${tipo}`

    requestAnimationFrame(() => {
        notificacao.classList.add('visivel')
    })

    clearTimeout(temporizadorNotificacaoTopo)

    temporizadorNotificacaoTopo = setTimeout(() => {
        notificacao.classList.remove('visivel')
    }, 3500)
}


function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

function formatarData(data) {
    if (!data) return '—'

    return new Date(data).toLocaleDateString('pt-BR', {
        timeZone: 'UTC'
    })
}

function obterDataInput(data) {
    if (!data) return ''

    const valor = String(data)

    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
        return valor.slice(0, 10)
    }

    const dataConvertida = new Date(data)

    return Number.isNaN(dataConvertida.getTime())
        ? ''
        : dataConvertida.toISOString().slice(0, 10)
}

function escaparHTML(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere])
}

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            ...(opcoes.body
                ? { 'Content-Type': 'application/json' }
                : {}),
            ...(opcoes.headers || {})
        }
    })

    const dados = await resposta.json().catch(() => ({}))

    if (resposta.status === 401) {
        window.location.href = '/'
        throw new Error('Sessão expirada.')
    }

    if (!resposta.ok) {
        throw new Error(
            dados.mensagem || 'Não foi possível concluir a operação.'
        )
    }

    return dados
}

// CARREGAR CAIXAS PARA O FORMULÁRIO
async function carregarCaixas() {
    try {
        const dados = await requisicao('/caixas')

        caixas = Array.isArray(dados)
            ? dados
            : (dados.caixas || dados.dados || [])
    } catch (erro) {
        console.error('Erro ao carregar caixas:', erro)
        caixas = []
    }

    atualizarSeletorCaixas()
}

// CARREGAR METAS DO BACK-END
async function carregarMetas() {
    try {
        const dados = await requisicao('/metas')

        metas = Array.isArray(dados)
            ? dados
            : (dados.metas || dados.dados || [])

        atualizarResumo()
        renderizarMetas()
    } catch (erro) {
        console.error('Erro ao carregar metas:', erro)

        listaMetas.innerHTML =
            '<p class="mensagem-vazia">Erro ao carregar as metas.</p>'

        mostrarMensagem(erro.message, 'erro')
    }
}

// ATUALIZAR CONTADORES
function atualizarResumo() {
    const totalMetas = document.getElementById('totalMetas')
    const totalEconomia = document.getElementById('totalEconomia')
    const totalDespesas = document.getElementById('totalDespesas')

    if (totalMetas) totalMetas.textContent = metas.length

    if (totalEconomia) {
        totalEconomia.textContent =
            metas.filter(meta => meta.tipo === 'economia').length
    }

    if (totalDespesas) {
        totalDespesas.textContent =
            metas.filter(meta => meta.tipo === 'despesa').length
    }
}

// LOCALIZAR A CAIXA DA META
function caixaDaMeta(meta) {
    if (meta.caixa && meta.caixa.nome) {
        return meta.caixa
    }

    return caixas.find(caixa =>
        Number(caixa.id) === Number(meta.caixaId)
    ) || null
}

// O BACK-END É A FONTE PRINCIPAL DO PROGRESSO.
// Não recalculamos o saldo a partir de /caixas, pois ele pode estar desatualizado.
function progressoDaMeta(meta) {
    return Math.max(0, Number(meta.progresso || 0))
}

// RENDERIZAR OS CARDS
function renderizarMetas() {
    if (!metas.length) {
        listaMetas.innerHTML =
            '<p class="mensagem-vazia">Você ainda não cadastrou nenhuma meta.</p>'
        return
    }

    listaMetas.innerHTML = metas.map(meta => {
        const valorAtual = progressoDaMeta(meta)
        const objetivo = Number(meta.valorAlvo || 0)

        const percentualCalculado = objetivo > 0
            ? (valorAtual / objetivo) * 100
            : 0

        // Prioriza o percentual calculado pelo back-end.
        const percentual = Number.isFinite(Number(meta.percentual))
            ? Number(meta.percentual)
            : percentualCalculado

        const largura = Math.min(100, Math.max(0, percentual))

        const restanteBruto = objetivo - valorAtual
        const faltaEconomizar = Math.max(0, restanteBruto)

        const excedido =
            meta.tipo === 'despesa' && restanteBruto < 0

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

        if (meta.tipo === 'economia' && valorAtual >= objetivo) {
            textoRestante = 'Meta alcançada!'
        } else if (meta.tipo === 'despesa' && restanteBruto < 0) {
            textoRestante =
                `Limite excedido em ${formatarMoeda(Math.abs(restanteBruto))}`
        } else {
            textoRestante = formatarMoeda(faltaEconomizar)
        }

        const caixa = caixaDaMeta(meta)
        const nomeCaixa =
            meta.caixaNome ||
            caixa?.nome ||
            'Nenhuma caixa vinculada'

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
                    <strong>${formatarMoeda(valorAtual)}</strong>
                </div>

                <div class="progresso-fundo">
                    <div
                        class="progresso-preenchido ${excedido ? 'excedido' : ''}"
                        style="width: ${largura}%">
                    </div>
                </div>

                <div class="meta-percentual">
                    ${percentual.toFixed(1).replace('.', ',')}% do objetivo
                </div>

                <div class="meta-valor">
                    <span>Objetivo</span>
                    <strong>${formatarMoeda(objetivo)}</strong>
                </div>

                <div class="meta-valor">
                    <span>${nomeRestante}</span>
                    <strong>${textoRestante}</strong>
                </div>

                <div class="meta-valor">
                    <span>Caixa vinculada</span>
                    <strong>${escaparHTML(nomeCaixa)}</strong>
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
                        data-id="${meta.id}">
                        Editar
                    </button>

                    <button
                        type="button"
                        class="botao-acao botao-excluir"
                        data-acao="excluir"
                        data-id="${meta.id}">
                        Excluir
                    </button>
                </div>
            </article>
        `
    }).join('')
}

// FILTRAR CAIXAS CONFORME O TIPO DA META
function atualizarSeletorCaixas(valorSelecionado = '') {
    const tipoSelecionado = tipo.value

    if (!tipoSelecionado) {
        caixaId.innerHTML =
            '<option value="">Selecione primeiro o tipo de meta</option>'

        caixaId.disabled = true
        caixaId.required = true

        ajudaCaixa.textContent =
            'Escolha o tipo de meta para listar as caixas compatíveis.'

        return
    }

    const tipoCaixa = tipoSelecionado === 'economia'
        ? 'reserva'
        : 'despesa'

    const filtradas = caixas.filter(caixa =>
        String(caixa.tipo).toLowerCase() === tipoCaixa
    )

    caixaId.disabled = false
    caixaId.required = true

    caixaId.innerHTML =
        '<option value="">Selecione uma caixa</option>' +
        filtradas.map(caixa => {
            const informacao = tipoCaixa === 'reserva'
                ? ` — disponível: ${formatarMoeda(caixa.saldo)}`
                : ` — limite: ${formatarMoeda(caixa.limiteMensal)}`

            return `
                <option value="${Number(caixa.id)}">
                    ${escaparHTML(caixa.nome)}${informacao}
                </option>
            `
        }).join('')

    if (
        valorSelecionado &&
        filtradas.some(caixa =>
            Number(caixa.id) === Number(valorSelecionado)
        )
    ) {
        caixaId.value = String(valorSelecionado)
    }

    ajudaCaixa.textContent = filtradas.length
        ? (
            tipoSelecionado === 'economia'
                ? 'Selecione uma caixa do tipo Reserva Financeira.'
                : 'Selecione uma caixa do tipo Despesas.'
        )
        : (
            tipoSelecionado === 'economia'
                ? 'Você ainda não possui caixas de Reserva Financeira. Cadastre uma em Orçamentos.'
                : 'Você ainda não possui caixas de Despesas. Cadastre uma em Orçamentos.'
        )
}

// ABRIR E FECHAR MODAL
function abrirModal() {
    modalMeta.classList.add('aberto')
    modalMeta.setAttribute('aria-hidden', 'false')
    document.body.classList.add('modal-meta-aberto')

    setTimeout(() => titulo.focus(), 50)
}

function fecharModal() {
    modalMeta.classList.remove('aberto')
    modalMeta.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('modal-meta-aberto')
}

// LIMPAR FORMULÁRIO
function limparFormulario() {
    formMeta.reset()
    metaId.value = ''

    btnSalvar.textContent = 'Cadastrar meta'
    btnCancelar.hidden = true

    const tituloFormulario = document.getElementById('tituloFormulario')

    if (tituloFormulario) {
        tituloFormulario.textContent = 'Cadastrar nova meta'
    }

    atualizarSeletorCaixas()
}

function novaMeta() {
    limparFormulario()
    mostrarMensagem('', '')
    abrirModal()
}

// EDITAR META
function editarMeta(id) {
    const meta = metas.find(item => Number(item.id) === Number(id))

    if (!meta) return

    limparFormulario()

    metaId.value = meta.id
    titulo.value = meta.titulo
    tipo.value = meta.tipo
    valorAlvo.value = meta.valorAlvo
    dataInicio.value = obterDataInput(meta.dataInicio)
    dataFim.value = obterDataInput(meta.dataFim)

    atualizarSeletorCaixas(meta.caixaId || meta.caixa?.id || '')

    caixaId.value = String(meta.caixaId || meta.caixa?.id || '')

    btnSalvar.textContent = 'Salvar alterações'
    btnCancelar.hidden = false

    const tituloFormulario = document.getElementById('tituloFormulario')

    if (tituloFormulario) {
        tituloFormulario.textContent = 'Editar meta'
    }

    abrirModal()
}

// EXCLUIR META

async function excluirMeta(id) {
    if (!confirm('Deseja realmente excluir esta meta?')) return

    try {
        await requisicao(`/metas/${id}`, {
            method: 'DELETE'
        })

        mostrarNotificacaoTopo('Meta Excluída')

        await carregarMetas()
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro')
    }
}


// CADASTRAR OU EDITAR META
formMeta.addEventListener('submit', async evento => {
    evento.preventDefault()

    if (!formMeta.reportValidity()) return

    if (dataInicio.value > dataFim.value) {
        mostrarMensagem(
            'A data inicial não pode ser posterior à data final.',
            'erro'
        )
        return
    }

    if (!caixaId.value) {
        mostrarMensagem(
            'Selecione uma caixa compatível com o tipo da meta.',
            'erro'
        )
        return
    }

    const dados = {
        titulo: titulo.value.trim(),
        tipo: tipo.value,
        valorAlvo: Number(valorAlvo.value),
        dataInicio: dataInicio.value,
        dataFim: dataFim.value,
        caixaId: Number(caixaId.value)
    }

    const id = metaId.value

    try {
        await requisicao(id ? `/metas/${id}` : '/metas', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(dados)
        })


        if (id) {
            mostrarMensagem('Meta atualizada com sucesso!', 'sucesso')
        } else {
            mostrarNotificacaoTopo('Nova Meta Criada')
        }


        limparFormulario()
        fecharModal()

        await carregarCaixas()
        await carregarMetas()
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro')
    }
})

// BOTÕES DE EDITAR E EXCLUIR
listaMetas.addEventListener('click', evento => {
    const botao = evento.target.closest('button[data-acao]')

    if (!botao) return

    if (botao.dataset.acao === 'editar') {
        editarMeta(Number(botao.dataset.id))
    }

    if (botao.dataset.acao === 'excluir') {
        excluirMeta(Number(botao.dataset.id))
    }
})

// EVENTOS DO MODAL
document
    .getElementById('btnAbrirModalMeta')
    .addEventListener('click', novaMeta)

document
    .getElementById('btnFecharModalMeta')
    .addEventListener('click', fecharModal)

document
    .getElementById('btnCancelarModal')
    .addEventListener('click', () => {
        limparFormulario()
        fecharModal()
    })

document
    .querySelectorAll('[data-fechar-modal="true"]')
    .forEach(elemento => {
        elemento.addEventListener('click', fecharModal)
    })

tipo.addEventListener('change', () => {
    atualizarSeletorCaixas()
})

btnCancelar.addEventListener('click', () => {
    limparFormulario()

    const tituloFormulario = document.getElementById('tituloFormulario')

    if (tituloFormulario) {
        tituloFormulario.textContent = 'Cadastrar nova meta'
    }
})

document.addEventListener('keydown', evento => {
    if (
        evento.key === 'Escape' &&
        modalMeta.classList.contains('aberto')
    ) {
        fecharModal()
    }
})

// SAIR DA CONTA
const btnSair = document.getElementById('btnSair')

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

// INICIALIZAÇÃO
async function iniciar() {
    await carregarCaixas()
    await carregarMetas()
}

iniciar()
