
'use strict'

const formCaixa = document.getElementById('formCaixa')
const campoId = document.getElementById('caixaId')
const campoNome = document.getElementById('nomeCaixa')
const campoTipo = document.getElementById('tipoCaixa')
const campoLimite = document.getElementById('limiteMensal')
const campoLimiteContainer = document.getElementById('campoLimite')
const modalCaixa = document.getElementById('modalCaixa')
const btnNovaCaixa = document.getElementById('btnNovaCaixa')

const formVinculo = document.getElementById('formVinculo')
const campoCategoriaVinculo = document.getElementById('categoriaVinculo')
const campoCaixaVinculo = document.getElementById('caixaVinculo')

const formMovimentacao = document.getElementById('formMovimentacao')
const modalMovimentacao = document.getElementById('modalMovimentacao')
const btnCancelarMovimentacao = document.getElementById('btnCancelarMovimentacao')
const campoTipoMovimentacao = document.getElementById('tipoMovimentacao')
const campoValorMovimentacao = document.getElementById('valorMovimentacao')
const campoDescricaoMovimentacao = document.getElementById('descricaoMovimentacao')

const lista = document.getElementById('listaCaixas')
const modalHistorico = document.getElementById('modalHistorico')
const modalVinculo = document.getElementById('modalVinculo')
const descricaoModalMovimentacao = document.getElementById('descricaoModalMovimentacao')
const descricaoVinculo = document.getElementById('descricaoVinculo')
const listaHistorico = document.getElementById('listaHistorico')
const mensagemHistorico = document.getElementById('mensagemHistorico')
const subtituloHistorico = document.getElementById('subtituloHistorico')
const btnBaixarPdf = document.getElementById('btnBaixarPdf')

const mensagem = document.getElementById('mensagem')
const mensagemVinculo = document.getElementById('mensagemVinculo')
const mensagemMovimentacao = document.getElementById('mensagemMovimentacao')
const notificacao = document.getElementById('notificacao')

const btnSalvar = document.getElementById('btnSalvar')
const btnCancelar = document.getElementById('btnCancelar')

let caixas = []
let categorias = []
let historicoAtual = null
let caixaMovimentacaoId = null
let temporizadorNotificacao

const dataAtual = document.getElementById('dataAtual')

dataAtual.textContent = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
})

// Funções auxiliares

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere])
}

function moeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

function mostrarMensagem(elemento, texto, tipo = '') {
    elemento.textContent = texto
    elemento.className = `mensagem ${tipo}`.trim()
}

function mostrarNotificacao(texto, tipo = 'sucesso') {
    notificacao.textContent = texto
    notificacao.className = `notificacao ${tipo} visivel`

    clearTimeout(temporizadorNotificacao)

    temporizadorNotificacao = setTimeout(() => {
        notificacao.classList.remove('visivel')
    }, 3000)
}

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
            ...opcoes.headers
        }
    })

    if (resposta.status === 401) {
        window.location.href = '/html/login.html'
        throw new Error('Sua sessão expirou. Entre novamente.')
    }

    const texto = await resposta.text()
    let dados = {}

    if (texto) {
        try {
            dados = JSON.parse(texto)
        } catch {
            dados = { mensagem: texto }
        }
    }

    if (!resposta.ok) {
        throw new Error(dados.mensagem || 'Não foi possível realizar a operação.')
    }

    return dados
}

function normalizarLista(dados) {
    if (Array.isArray(dados)) return dados
    if (dados && Array.isArray(dados.movimentacoes)) return dados.movimentacoes
    if (dados && Array.isArray(dados.registros)) return dados.registros
    if (dados && Array.isArray(dados.dados)) return dados.dados
    return []
}

function abrirModal(dialogo) {
    if (!dialogo) return

    if (typeof dialogo.showModal === 'function') {
        if (!dialogo.open) dialogo.showModal()
    } else {
        dialogo.setAttribute('open', '')
    }
}

function fecharModal(dialogo) {
    if (!dialogo) return

    if (typeof dialogo.close === 'function' && dialogo.open) {
        dialogo.close()
    } else {
        dialogo.removeAttribute('open')
    }
}

function atualizarCampoLimite() {
    const ehDespesa = campoTipo.value === 'despesa'
    const container = campoLimite.closest('.campo') || campoLimiteContainer

    container.hidden = !ehDespesa
    campoLimite.required = ehDespesa
}

// Carregamento de categorias e caixas

async function carregarCategorias() {
    categorias = normalizarLista(await requisicao('/categorias'))

    const despesas = categorias.filter(
        categoria => categoria.tipo === 'despesa'
    )

    campoCategoriaVinculo.innerHTML =
        '<option value="">Selecione uma categoria</option>' +
        despesas.map(categoria => `
            <option value="${Number(categoria.id)}">
                ${escaparHTML(categoria.nome)}
            </option>
        `).join('')

    if (!despesas.length) {
        campoCategoriaVinculo.innerHTML =
            '<option value="">Cadastre uma categoria de despesa primeiro</option>'
    }
}

// Calcula os gastos de cada caixa a partir das movimentações

async function carregarCaixas() {
    const [dadosCaixas, dadosMovimentacoes] = await Promise.all([
        requisicao('/caixas'),
        requisicao('/movimentacoes')
    ])

    caixas = normalizarLista(dadosCaixas)

    const movimentacoes = normalizarLista(dadosMovimentacoes)

    calcularGastosDasCaixas(movimentacoes)

    atualizarResumo()
    renderizarCaixas()
}

function calcularGastosDasCaixas(movimentacoes) {
    const agora = new Date()

    const anoAtual = agora.getFullYear()
    const mesAtual = agora.getMonth()

    caixas = caixas.map(caixa => {
        if (caixa.tipo !== 'despesa') {
            return caixa
        }

        const categoriasCaixa = Array.isArray(caixa.categorias)
            ? caixa.categorias
            : []

        const idsCategorias = new Set(
            categoriasCaixa.map(categoria => Number(categoria.id))
        )

        const gasto = movimentacoes.reduce((total, movimentacao) => {
            const categoriaId = Number(
                movimentacao.categoriaId ??
                movimentacao.categoriaRef?.id ??
                movimentacao.categoria?.id
            )

            if (
                movimentacao.tipo !== 'despesa' ||
                !idsCategorias.has(categoriaId)
            ) {
                return total
            }

            if (!movimentacao.data) {
                return total
            }

            const data = new Date(movimentacao.data)

            if (
                Number.isNaN(data.getTime()) ||
                data.getUTCFullYear() !== anoAtual ||
                data.getUTCMonth() !== mesAtual
            ) {
                return total
            }

            return total + Number(movimentacao.valor || 0)
        }, 0)

        const limite = Number(caixa.limiteMensal || 0)

        return {
            ...caixa,
            gasto,
            restante: limite - gasto,
            percentual: limite > 0
                ? Math.min((gasto / limite) * 100, 100)
                : 0,
            ultrapassou: gasto > limite
        }
    })
}

function atualizarResumo() {
    const despesas = caixas.filter(caixa => caixa.tipo === 'despesa')
    const reservas = caixas.filter(caixa => caixa.tipo === 'reserva')

    const limiteTotal = despesas.reduce(
        (total, caixa) => total + Number(caixa.limiteMensal || 0),
        0
    )

    const saldoTotal = reservas.reduce(
        (total, caixa) => total + Number(caixa.saldo || 0),
        0
    )

    document.getElementById('totalCaixas').textContent = caixas.length
    document.getElementById('limiteTotal').textContent = moeda(limiteTotal)
    document.getElementById('saldoTotal').textContent = moeda(saldoTotal)
}

// Renderização das caixas

function renderizarCaixas() {
    const pesquisa = document.getElementById('pesquisa').value.trim().toLowerCase()
    const filtroTipo = document.getElementById('filtroTipo').value

    const filtradas = caixas.filter(caixa => {
        const correspondeNome = String(caixa.nome || '')
            .toLowerCase()
            .includes(pesquisa)

        const correspondeTipo =
            filtroTipo === 'todos' || caixa.tipo === filtroTipo

        return correspondeNome && correspondeTipo
    })

    document.getElementById('quantidadeRegistros').textContent =
        `${filtradas.length} ${filtradas.length === 1 ? 'caixa' : 'caixas'}`

    if (!filtradas.length) {
        lista.innerHTML = '<p class="estado-vazio">Nenhuma caixa encontrada.</p>'
        return
    }

    lista.innerHTML = filtradas.map(caixa => (
        caixa.tipo === 'reserva'
            ? renderizarReserva(caixa)
            : renderizarDespesa(caixa)
    )).join('')
}

function renderizarDespesa(caixa) {
    const limite = Number(caixa.limiteMensal || 0)
    const gasto = Number(caixa.gasto || 0)
    const restante = Number(caixa.restante ?? limite - gasto)
    const percentual = limite > 0 ? gasto / limite * 100 : 0

    const classe = percentual > 100
        ? 'barra-excedida'
        : percentual >= 80
            ? 'barra-alerta'
            : 'barra-normal'

    const categoriasCaixa = Array.isArray(caixa.categorias)
        ? caixa.categorias
        : []

    const nomesCategorias = categoriasCaixa.length
        ? categoriasCaixa.map(categoria => escaparHTML(categoria.nome)).join(', ')
        : 'Nenhuma categoria vinculada'

    return `
        <article class="caixa-card">
            <div class="caixa-cabecalho">
                <div>
                    <h3>${escaparHTML(caixa.nome)}</h3>
                    <span class="caixa-tipo">Caixa de despesas</span>
                </div>
            </div>

            <p class="caixa-valor">${moeda(gasto)}</p>
            <p class="caixa-descricao">Gasto neste mês de ${moeda(limite)} disponíveis</p>

            <div class="caixa-progresso">
                <span class="${classe}" style="width:${Math.max(0, Math.min(percentual, 100))}%"></span>
            </div>

            <div class="caixa-detalhes">
                <span>${percentual.toFixed(1).replace('.', ',')}% utilizado</span>
                <span class="${restante < 0 ? 'valor-negativo' : ''}">
                    ${restante < 0 ? 'Excedido: ' : 'Restante: '}${moeda(Math.abs(restante))}
                </span>
            </div>

            <div class="caixa-categorias">
                <strong>Categorias:</strong><br>
                ${nomesCategorias}
            </div>

            <div class="caixa-acoes">
                <button class="botao-historico" data-acao="historico" data-id="${Number(caixa.id)}" type="button">Histórico</button>
                <button class="botao-editar" data-acao="editar" data-id="${Number(caixa.id)}" type="button">Editar</button>
                <button class="botao-excluir" data-acao="excluir" data-id="${Number(caixa.id)}" type="button">Excluir</button>
                <button class="botao-cadastrar-despesas" data-acao="cadastrar-despesas" data-id="${Number(caixa.id)}" type="button">Cadastrar Despesas</button>
            </div>
        </article>
    `
}

function renderizarReserva(caixa) {
    const saldo = Number(caixa.saldo || 0)
    const depositado = Number(caixa.totalDepositado || 0)
    const retirado = Number(caixa.totalRetirado || 0)

    return `
        <article class="caixa-card">
            <div class="caixa-cabecalho">
                <div>
                    <h3>${escaparHTML(caixa.nome)}</h3>
                    <span class="caixa-tipo">Reserva financeira</span>
                </div>
            </div>

            <p class="caixa-valor">${moeda(saldo)}</p>
            <p class="caixa-descricao">Saldo disponível na reserva</p>

            <div class="caixa-detalhes">
                <span>Total depositado: ${moeda(depositado)}</span>
                <span>Total retirado: ${moeda(retirado)}</span>
            </div>

            <div class="caixa-acoes">
                <button class="botao-historico" data-acao="historico" data-id="${Number(caixa.id)}" type="button">Histórico</button>
                <button class="botao-editar" data-acao="editar" data-id="${Number(caixa.id)}" type="button">Editar</button>
                <button class="botao-excluir" data-acao="excluir" data-id="${Number(caixa.id)}" type="button">Excluir</button>
                <button class="botao-remanejar" data-acao="remanejar" data-id="${Number(caixa.id)}" type="button">Remanejar</button>
            </div>
        </article>
    `
}

// Cadastro e edição de caixas

function limparFormulario() {
    formCaixa.reset()
    campoId.value = ''

    document.getElementById('tituloFormulario').textContent = 'Nova caixa'
    document.getElementById('descricaoFormulario').textContent =
        'Cadastre uma caixa de despesas ou uma reserva financeira.'

    btnSalvar.textContent = 'Criar caixa'

    atualizarCampoLimite()
    mostrarMensagem(mensagem, '')
}

function abrirFormularioNovaCaixa() {
    limparFormulario()
    abrirModal(modalCaixa)
    campoNome.focus()
}

function abrirFormularioEdicao(caixa) {
    limparFormulario()

    campoId.value = String(caixa.id)
    campoNome.value = caixa.nome || ''
    campoTipo.value = caixa.tipo || 'despesa'
    campoLimite.value = caixa.limiteMensal ?? ''

    document.getElementById('tituloFormulario').textContent = 'Editar caixa'
    document.getElementById('descricaoFormulario').textContent =
        `Altere os dados de “${caixa.nome}”. As alterações só serão salvas após confirmar.`

    btnSalvar.textContent = 'Salvar alterações'

    atualizarCampoLimite()
    abrirModal(modalCaixa)
    campoNome.focus()
}

btnNovaCaixa.addEventListener('click', abrirFormularioNovaCaixa)
campoTipo.addEventListener('change', atualizarCampoLimite)

formCaixa.addEventListener('submit', async evento => {
    evento.preventDefault()

    const id = campoId.value
    const tipo = campoTipo.value

    const dados = {
        nome: campoNome.value.trim(),
        tipo,
        limiteMensal: tipo === 'despesa' ? Number(campoLimite.value) : null
    }

    if (!dados.nome) {
        mostrarMensagem(mensagem, 'Informe o nome da caixa.', 'erro')
        campoNome.focus()
        return
    }

    if (
        tipo === 'despesa' &&
        (!Number.isFinite(dados.limiteMensal) || dados.limiteMensal <= 0)
    ) {
        mostrarMensagem(mensagem, 'Informe um limite mensal válido.', 'erro')
        campoLimite.focus()
        return
    }

    btnSalvar.disabled = true
    mostrarMensagem(mensagem, '')

    try {
        await requisicao(id ? `/caixas/${encodeURIComponent(id)}` : '/caixas', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(dados)
        })

        await carregarCaixas()

        const textoSucesso = id
            ? 'Caixa atualizada com sucesso.'
            : 'Caixa criada com sucesso.'

        limparFormulario()
        fecharModal(modalCaixa)
        mostrarNotificacao(textoSucesso)
    } catch (erro) {
        mostrarMensagem(mensagem, erro.message, 'erro')
    } finally {
        btnSalvar.disabled = false
    }
})

btnCancelar.addEventListener('click', () => {
    limparFormulario()
    fecharModal(modalCaixa)
})

modalCaixa.addEventListener('close', limparFormulario)

// Fechamento dos modais

document.querySelectorAll('[data-fechar]').forEach(botao => {
    botao.addEventListener('click', () => {
        const dialogo = document.getElementById(botao.dataset.fechar)

        if (dialogo === modalCaixa) limparFormulario()
        if (dialogo === modalMovimentacao) limparFormularioMovimentacao()

        fecharModal(dialogo)
    })
})

;[modalCaixa, modalHistorico, modalVinculo, modalMovimentacao].forEach(dialogo => {
    dialogo.addEventListener('click', evento => {
        if (evento.target === dialogo) {
            if (dialogo === modalCaixa) limparFormulario()
            if (dialogo === modalMovimentacao) limparFormularioMovimentacao()

            fecharModal(dialogo)
        }
    })
})

// Vinculação de categorias

formVinculo.addEventListener('submit', async evento => {
    evento.preventDefault()

    const categoriaId = Number(campoCategoriaVinculo.value)
    const caixaId = Number(campoCaixaVinculo.value)

    const categoria = categorias.find(
        item => Number(item.id) === categoriaId
    )

    if (!categoria || !caixaId) {
        mostrarMensagem(mensagemVinculo, 'Selecione uma categoria e uma caixa.', 'erro')
        return
    }

    const botaoEnviar = formVinculo.querySelector('button[type="submit"]')
    botaoEnviar.disabled = true

    try {
        await requisicao(`/categorias/${categoriaId}`, {
            method: 'PUT',
            body: JSON.stringify({
                nome: categoria.nome,
                tipo: categoria.tipo,
                caixaId
            })
        })

        await carregarCategorias()
        await carregarCaixas()

        campoCategoriaVinculo.value = ''
        fecharModal(modalVinculo)

        mostrarNotificacao('Categoria vinculada com sucesso.')
    } catch (erro) {
        mostrarMensagem(mensagemVinculo, erro.message, 'erro')
    } finally {
        botaoEnviar.disabled = false
    }
})

// Movimentação da reserva

function limparFormularioMovimentacao() {
    formMovimentacao.reset()
    caixaMovimentacaoId = null
    mostrarMensagem(mensagemMovimentacao, '')
}

btnCancelarMovimentacao.addEventListener('click', () => {
    limparFormularioMovimentacao()
    fecharModal(modalMovimentacao)
})

modalMovimentacao.addEventListener('close', limparFormularioMovimentacao)

formMovimentacao.addEventListener('submit', async evento => {
    evento.preventDefault()

    const caixaId = caixaMovimentacaoId

    const dados = {
        tipo: campoTipoMovimentacao.value,
        valor: Number(campoValorMovimentacao.value),
        descricao: campoDescricaoMovimentacao.value.trim()
    }

    if (!caixaId) {
        mostrarMensagem(
            mensagemMovimentacao,
            'Não foi possível identificar a reserva selecionada.',
            'erro'
        )
        return
    }

    if (!Number.isFinite(dados.valor) || dados.valor <= 0) {
        mostrarMensagem(mensagemMovimentacao, 'Informe um valor válido.', 'erro')
        return
    }

    const botao = document.getElementById('btnMovimentar')
    botao.disabled = true

    try {
        await requisicao(`/caixas/${encodeURIComponent(caixaId)}/movimentacoes`, {
            method: 'POST',
            body: JSON.stringify(dados)
        })

        await carregarCaixas()

        limparFormularioMovimentacao()
        fecharModal(modalMovimentacao)

        mostrarNotificacao(
            dados.tipo === 'deposito'
                ? 'Depósito registrado com sucesso.'
                : 'Retirada registrada com sucesso.'
        )
    } catch (erro) {
        mostrarMensagem(mensagemMovimentacao, erro.message, 'erro')
    } finally {
        botao.disabled = false
    }
})

// Ações dos cartões

lista.addEventListener('click', async evento => {
    const botao = evento.target.closest('button[data-acao]')

    if (!botao) return

    const id = Number(botao.dataset.id)
    const caixa = caixas.find(item => Number(item.id) === id)

    if (!caixa) return

    if (botao.dataset.acao === 'editar') {
        abrirFormularioEdicao(caixa)
        return
    }

    if (botao.dataset.acao === 'excluir') {
        const confirmacao = caixa.tipo === 'reserva'
            ? `Deseja excluir a reserva "${caixa.nome}"? O histórico de depósitos e retiradas também será excluído.`
            : `Deseja excluir a caixa "${caixa.nome}"? As categorias vinculadas ficarão sem caixa.`

        if (!confirm(confirmacao)) return

        botao.disabled = true

        try {
            await requisicao(`/caixas/${id}`, { method: 'DELETE' })

            if (campoId.value === String(id)) {
                limparFormulario()
                fecharModal(modalCaixa)
            }

            await carregarCategorias()
            await carregarCaixas()

            mostrarNotificacao('Caixa excluída com sucesso.')
        } catch (erro) {
            mostrarNotificacao(erro.message, 'erro')
        } finally {
            botao.disabled = false
        }

        return
    }

    if (botao.dataset.acao === 'historico') {
        await carregarHistorico(caixa)
        return
    }

    if (botao.dataset.acao === 'remanejar') {
        if (caixa.tipo !== 'reserva') return

        caixaMovimentacaoId = Number(caixa.id)

        formMovimentacao.reset()

        descricaoModalMovimentacao.textContent =
            `Registre um depósito ou uma retirada na reserva “${caixa.nome}”.`

        mostrarMensagem(mensagemMovimentacao, '')
        abrirModal(modalMovimentacao)

        return
    }

    if (botao.dataset.acao === 'cadastrar-despesas') {
        campoCaixaVinculo.value = String(caixa.id)
        campoCategoriaVinculo.value = ''

        descricaoVinculo.textContent =
            `Selecione a categoria de despesa que deseja associar à caixa "${caixa.nome}".`

        mostrarMensagem(mensagemVinculo, '')
        abrirModal(modalVinculo)
    }
})

// Histórico

function formatarData(valor) {
    if (!valor) return '—'

    const texto = String(valor)
    const dataISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)

    const data = dataISO
        ? new Date(Date.UTC(
            Number(dataISO[1]),
            Number(dataISO[2]) - 1,
            Number(dataISO[3]),
            12
        ))
        : new Date(valor)

    if (Number.isNaN(data.getTime())) return '—'

    return data.toLocaleDateString('pt-BR', {
        timeZone: 'UTC'
    })
}

function descreverOperacao(item, caixa) {
    const tipo = String(item.tipo || item.operacao || '').toLowerCase()

    if (['deposito', 'depósito', 'deposit', 'entrada'].includes(tipo)) {
        return 'Depósito'
    }

    if (['retirada', 'saque', 'withdrawal', 'withdraw'].includes(tipo)) {
        return 'Retirada'
    }

    if (['despesa', 'expense'].includes(tipo)) return 'Despesa'
    if (['receita', 'income'].includes(tipo)) return 'Receita'
    if (item.operacao) return String(item.operacao)

    return caixa.tipo === 'reserva' ? 'Movimentação' : 'Despesa'
}

function formatarRegistroHistorico(item, caixa) {
    const operacao = descreverOperacao(item, caixa)
    const valorNumerico = Math.abs(Number(item.valor || 0))
    const operacaoNormalizada = operacao.toLocaleLowerCase('pt-BR')

    const negativo = ['retirada', 'despesa'].includes(operacaoNormalizada)
    const positivo = ['depósito', 'receita'].includes(operacaoNormalizada)

    const sinal = negativo ? '- ' : positivo ? '+ ' : ''

    return {
        data: formatarData(item.data),
        operacao,
        descricao: String(
            item.descricao || item.observacao || item.detalhes || 'Sem descrição'
        ),
        valorNumerico,
        valorFormatado: `${sinal}${moeda(valorNumerico)}`,
        classeValor: negativo
            ? 'valor-negativo'
            : positivo
                ? 'valor-positivo'
                : ''
    }
}

function renderizarTabelaHistorico(movimentacoes, caixa) {
    if (!movimentacoes.length) {
        listaHistorico.innerHTML = `
            <tr>
                <td colspan="4" class="estado-vazio">
                    Nenhuma movimentação registrada para esta caixa.
                </td>
            </tr>
        `
        return
    }

    listaHistorico.innerHTML = movimentacoes.map(item => {
        const registro = formatarRegistroHistorico(item, caixa)

        return `
            <tr>
                <td>${escaparHTML(registro.data)}</td>
                <td>${escaparHTML(registro.operacao)}</td>
                <td>${escaparHTML(registro.descricao)}</td>
                <td class="${registro.classeValor}">${escaparHTML(registro.valorFormatado)}</td>
            </tr>
        `
    }).join('')
}

async function buscarMovimentacoesDespesa(caixa) {
    const categoriasDaCaixa = Array.isArray(caixa.categorias)
        ? caixa.categorias
        : []

    const idsCategorias = new Set(
        categoriasDaCaixa.map(categoria => Number(categoria.id))
    )

    if (!idsCategorias.size) return []

    const todasMovimentacoes = normalizarLista(
        await requisicao('/movimentacoes')
    )

    return todasMovimentacoes.filter(item => {
        const categoriaId = Number(
            item.categoriaId ??
            item.categoriaRef?.id ??
            item.categoria?.id
        )

        return (
            item.tipo === 'despesa' &&
            idsCategorias.has(categoriaId)
        )
    })
}

async function carregarHistorico(caixa) {
    historicoAtual = { caixa, movimentacoes: [] }

    document.getElementById('tituloHistorico').textContent =
        `Histórico: ${caixa.nome}`

    subtituloHistorico.textContent = caixa.tipo === 'reserva'
        ? 'Depósitos e retiradas registrados nesta reserva.'
        : 'Despesas registradas nas categorias vinculadas a esta caixa.'

    listaHistorico.innerHTML =
        '<tr><td colspan="4" class="estado-vazio">Carregando histórico...</td></tr>'

    mostrarMensagem(mensagemHistorico, '')
    btnBaixarPdf.disabled = true

    abrirModal(modalHistorico)

    try {
        let movimentacoes

        if (caixa.tipo === 'reserva') {
            movimentacoes = normalizarLista(
                await requisicao(
                    `/caixas/${encodeURIComponent(caixa.id)}/movimentacoes`
                )
            )
        } else {
            movimentacoes = await buscarMovimentacoesDespesa(caixa)
        }

        movimentacoes.sort((a, b) => {
            const dataA = a.data ? new Date(a.data).getTime() : 0
            const dataB = b.data ? new Date(b.data).getTime() : 0

            return dataB - dataA
        })

        historicoAtual = { caixa, movimentacoes }

        renderizarTabelaHistorico(movimentacoes, caixa)
        btnBaixarPdf.disabled = false

        if (caixa.tipo === 'despesa' && !(caixa.categorias || []).length) {
            mostrarMensagem(
                mensagemHistorico,
                'Vincule uma ou mais categorias a esta caixa para consultar suas despesas.',
                ''
            )
        } else if (!movimentacoes.length) {
            mostrarMensagem(
                mensagemHistorico,
                'Não há movimentações registradas para esta caixa.',
                ''
            )
        } else {
            mostrarMensagem(
                mensagemHistorico,
                `${movimentacoes.length} movimentação(ões) encontrada(s).`,
                'sucesso'
            )
        }
    } catch (erro) {
        historicoAtual = null

        listaHistorico.innerHTML = `
            <tr>
                <td colspan="4" class="estado-vazio">
                    ${escaparHTML(erro.message)}
                </td>
            </tr>
        `

        mostrarMensagem(
            mensagemHistorico,
            `Não foi possível carregar o histórico: ${erro.message}`,
            'erro'
        )

        btnBaixarPdf.disabled = true
    }
}

// Geração do PDF

function textoPdf(texto) {
    const substituicoes = {
        '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133,
        '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138,
        '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145, '’': 146,
        '“': 147, '”': 148, '•': 149, '–': 150, '—': 151,
        '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156,
        'ž': 158, 'Ÿ': 159
    }

    let resultado = ''

    for (const caractere of String(texto ?? '')) {
        if (substituicoes[caractere]) {
            resultado += String.fromCharCode(substituicoes[caractere])
        } else if (caractere.charCodeAt(0) <= 255) {
            resultado += caractere
        } else {
            const simples = caractere
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')

            resultado += /^[\x20-\x7E]*$/.test(simples)
                ? simples
                : '?'
        }
    }

    return resultado
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

function escaparLiteralPdf(texto) {
    return textoPdf(texto)
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
}

function quebrarTextoPdf(texto, limiteCaracteres) {
    const palavras = textoPdf(texto).split(/\s+/).filter(Boolean)

    if (!palavras.length) return ['—']

    const linhas = []
    let linha = ''

    palavras.forEach(palavra => {
        if (palavra.length > limiteCaracteres) {
            if (linha) linhas.push(linha)
            linha = ''

            for (let inicio = 0; inicio < palavra.length; inicio += limiteCaracteres) {
                const pedaco = palavra.slice(inicio, inicio + limiteCaracteres)

                if (pedaco.length === limiteCaracteres) {
                    linhas.push(pedaco)
                } else {
                    linha = pedaco
                }
            }

            return
        }

        const candidata = linha ? `${linha} ${palavra}` : palavra

        if (candidata.length > limiteCaracteres) {
            linhas.push(linha)
            linha = palavra
        } else {
            linha = candidata
        }
    })

    if (linha) linhas.push(linha)

    return linhas.length ? linhas : ['—']
}

function comandoTextoPdf(texto, x, topo, tamanho = 9, alturaPagina = 595) {
    const y = alturaPagina - topo - tamanho - 2

    return `BT /F1 ${tamanho} Tf 0.12 0.16 0.22 rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escaparLiteralPdf(texto)}) Tj ET\n`
}

function linhaPdf(x1, y1Topo, x2, y2Topo, alturaPagina = 595) {
    const y1 = alturaPagina - y1Topo
    const y2 = alturaPagina - y2Topo

    return `0.78 0.82 0.87 RG 0.55 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`
}

function fundoRetanguloPdf(x, topo, largura, altura, alturaPagina = 595) {
    const y = alturaPagina - topo - altura

    return `0.92 0.95 0.98 rg ${x.toFixed(2)} ${y.toFixed(2)} ${largura.toFixed(2)} ${altura.toFixed(2)} re f\n`
}

function construirConteudoPaginaPdf(caixa, registros, numeroPagina, totalPaginas) {
    const alturaPagina = 595
    const margem = 36
    const largurasColunas = [80, 105, 490, 95]
    const xColunas = [margem]

    for (let i = 0; i < largurasColunas.length - 1; i++) {
        xColunas.push(xColunas[i] + largurasColunas[i])
    }

    let conteudo = ''

    conteudo += comandoTextoPdf(
        'Historico de movimentacoes', margem, 28, 17, alturaPagina
    )

    conteudo += comandoTextoPdf(
        `Caixa: ${caixa.nome} | Tipo: ${caixa.tipo === 'reserva' ? 'Reserva financeira' : 'Despesas'}`,
        margem, 53, 10, alturaPagina
    )

    conteudo += comandoTextoPdf(
        `Gerado em ${new Date().toLocaleString('pt-BR')} | Pagina ${numeroPagina} de ${totalPaginas}`,
        margem, 70, 8, alturaPagina
    )

    const topoTabela = 94
    const alturaCabecalho = 25

    const larguraTabela = largurasColunas.reduce(
        (soma, largura) => soma + largura,
        0
    )

    conteudo += fundoRetanguloPdf(
        margem, topoTabela, larguraTabela, alturaCabecalho, alturaPagina
    )

    conteudo += linhaPdf(
        margem, topoTabela,
        margem + larguraTabela, topoTabela, alturaPagina
    )

    conteudo += linhaPdf(
        margem, topoTabela + alturaCabecalho,
        margem + larguraTabela, topoTabela + alturaCabecalho, alturaPagina
    )

    const titulos = ['Data', 'Operacao', 'Descricao', 'Valor']

    titulos.forEach((titulo, i) => {
        conteudo += comandoTextoPdf(
            titulo, xColunas[i] + 6, topoTabela + 7, 9, alturaPagina
        )
    })

    xColunas.forEach(x => {
        conteudo += linhaPdf(
            x, topoTabela, x, topoTabela + alturaCabecalho, alturaPagina
        )
    })

    conteudo += linhaPdf(
        margem + larguraTabela, topoTabela,
        margem + larguraTabela, topoTabela + alturaCabecalho, alturaPagina
    )

    let y = topoTabela + alturaCabecalho

    registros.forEach(registro => {
        const alturaLinha = Math.max(
            28,
            registro.linhasDescricao.length * 11 + 11
        )

        const yTexto = y + Math.max(
            5,
            (alturaLinha - registro.linhasDescricao.length * 11) / 2 - 1
        )

        registro.valoresFixos.forEach((valor, i) => {
            conteudo += comandoTextoPdf(
                valor, xColunas[i] + 6, yTexto, 8.5, alturaPagina
            )
        })

        registro.linhasDescricao.forEach((linha, indice) => {
            conteudo += comandoTextoPdf(
                linha, xColunas[2] + 6, yTexto + indice * 11, 8.5, alturaPagina
            )
        })

        conteudo += linhaPdf(
            margem, y + alturaLinha,
            margem + larguraTabela, y + alturaLinha, alturaPagina
        )

        xColunas.forEach(x => {
            conteudo += linhaPdf(x, y, x, y + alturaLinha, alturaPagina)
        })

        conteudo += linhaPdf(
            margem + larguraTabela, y,
            margem + larguraTabela, y + alturaLinha, alturaPagina
        )

        y += alturaLinha
    })

    if (!registros.length) {
        const alturaLinha = 34

        conteudo += comandoTextoPdf(
            'Nenhuma movimentacao registrada para esta caixa.',
            margem + 6, y + 10, 9, alturaPagina
        )

        conteudo += linhaPdf(
            margem, y + alturaLinha,
            margem + larguraTabela, y + alturaLinha, alturaPagina
        )

        xColunas.forEach(x => {
            conteudo += linhaPdf(x, y, x, y + alturaLinha, alturaPagina)
        })

        conteudo += linhaPdf(
            margem + larguraTabela, y,
            margem + larguraTabela, y + alturaLinha, alturaPagina
        )
    }

    return conteudo
}

function stringBinariaParaBytes(texto) {
    const bytes = new Uint8Array(texto.length)

    for (let i = 0; i < texto.length; i++) {
        bytes[i] = texto.charCodeAt(i) & 0xff
    }

    return bytes
}

function montarPdf(conteudosPaginas) {
    const totalPaginas = conteudosPaginas.length
    const idFonte = 3 + totalPaginas * 2
    const objetos = []

    objetos[1] = '<< /Type /Catalog /Pages 2 0 R >>'

    const referenciasPaginas = []

    for (let i = 0; i < totalPaginas; i++) {
        const idPagina = 3 + i * 2
        const idConteudo = idPagina + 1

        referenciasPaginas.push(`${idPagina} 0 R`)

        const bytesConteudo = conteudosPaginas[i]

        objetos[idPagina] =
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${idFonte} 0 R >> >> /Contents ${idConteudo} 0 R >>`

        objetos[idConteudo] =
            `<< /Length ${bytesConteudo.length} >>\nstream\n${bytesConteudo}\nendstream`
    }

    objetos[2] =
        `<< /Type /Pages /Kids [${referenciasPaginas.join(' ')}] /Count ${totalPaginas} >>`

    objetos[idFonte] =
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'

    let pdf = '%PDF-1.4\n%âãÏÓ\n'
    const offsets = [0]

    for (let id = 1; id < objetos.length; id++) {
        offsets[id] = pdf.length
        pdf += `${id} 0 obj\n${objetos[id]}\nendobj\n`
    }

    const inicioXref = pdf.length

    pdf += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`

    for (let id = 1; id < objetos.length; id++) {
        pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
    }

    pdf += `trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`

    return stringBinariaParaBytes(pdf)
}

function prepararRegistrosPdf(caixa, movimentacoes) {
    return movimentacoes.map(item => {
        const registro = formatarRegistroHistorico(item, caixa)

        return {
            valoresFixos: [
                registro.data,
                registro.operacao,
                '',
                registro.valorFormatado
            ],
            linhasDescricao: quebrarTextoPdf(registro.descricao, 83)
        }
    })
}

function gerarPdfHistorico(caixa, movimentacoes) {
    const registros = prepararRegistrosPdf(caixa, movimentacoes)
    const paginas = []

    let atual = []
    let alturaUsada = 119

    const limiteInferior = 548

    registros.forEach(registro => {
        const alturaLinha = Math.max(
            28,
            registro.linhasDescricao.length * 11 + 11
        )

        if (alturaUsada + alturaLinha > limiteInferior && atual.length) {
            paginas.push(atual)
            atual = []
            alturaUsada = 119
        }

        atual.push(registro)
        alturaUsada += alturaLinha
    })

    if (atual.length || !paginas.length) {
        paginas.push(atual)
    }

    const conteudos = paginas.map((itens, indice) =>
        construirConteudoPaginaPdf(
            caixa, itens, indice + 1, paginas.length
        )
    )

    const bytes = montarPdf(conteudos)
    const arquivo = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(arquivo)
    const link = document.createElement('a')

    const nomeSeguro = textoPdf(caixa.nome)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'caixa'

    link.href = url
    link.download = `historico-${nomeSeguro}.pdf`

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
}

btnBaixarPdf.addEventListener('click', () => {
    if (!historicoAtual) return

    try {
        gerarPdfHistorico(
            historicoAtual.caixa,
            historicoAtual.movimentacoes
        )

        mostrarMensagem(
            mensagemHistorico,
            'PDF preparado para download.',
            'sucesso'
        )
    } catch (erro) {
        mostrarMensagem(
            mensagemHistorico,
            `Não foi possível gerar o PDF: ${erro.message}`,
            'erro'
        )
    }
})

// Pesquisa e filtros

document.getElementById('pesquisa').addEventListener(
    'input',
    renderizarCaixas
)

document.getElementById('filtroTipo').addEventListener(
    'change',
    renderizarCaixas
)

// Sair da conta

document.getElementById('btnSair').addEventListener('click', async evento => {
    evento.preventDefault()

    try {
        await requisicao('/auth/logout', { method: 'POST' })
        window.location.href = '/html/login.html'
    } catch (erro) {
        mostrarNotificacao(erro.message, 'erro')
    }
})

// Inicialização

async function iniciar() {
    atualizarCampoLimite()
    lista.innerHTML = '<p class="estado-vazio">Carregando caixas...</p>'

    try {
        await carregarCategorias()
        await carregarCaixas()
    } catch (erro) {
        lista.innerHTML =
            `<p class="estado-vazio">${escaparHTML(erro.message)}</p>`
    }
}

iniciar()
