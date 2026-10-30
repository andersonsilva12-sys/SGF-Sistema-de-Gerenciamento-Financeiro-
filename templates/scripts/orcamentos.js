
const formCaixa = document.getElementById('formCaixa')
const campoId = document.getElementById('caixaId')
const campoNome = document.getElementById('nomeCaixa')
const campoTipo = document.getElementById('tipoCaixa')
const campoLimite = document.getElementById('limiteMensal')
const campoLimiteContainer = document.getElementById('campoLimite')

const formVinculo = document.getElementById('formVinculo')
const campoCategoriaVinculo = document.getElementById('categoriaVinculo')
const campoCaixaVinculo = document.getElementById('caixaVinculo')

const formMovimentacao = document.getElementById('formMovimentacao')
const campoCaixaMovimentacao = document.getElementById('caixaMovimentacao')
const campoTipoMovimentacao = document.getElementById('tipoMovimentacao')
const campoValorMovimentacao = document.getElementById('valorMovimentacao')
const campoDescricaoMovimentacao = document.getElementById('descricaoMovimentacao')

const lista = document.getElementById('listaCaixas')
const listaHistorico = document.getElementById('listaHistorico')
const painelHistorico = document.getElementById('painelHistorico')

const mensagem = document.getElementById('mensagem')
const mensagemVinculo = document.getElementById('mensagemVinculo')
const mensagemMovimentacao = document.getElementById('mensagemMovimentacao')

const btnSalvar = document.getElementById('btnSalvar')
const btnCancelar = document.getElementById('btnCancelar')

let caixas = []
let categorias = []

document.getElementById('dataAtual').textContent =
    new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })

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
    elemento.className = `mensagem ${tipo}`
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

function atualizarCampoLimite() {
    const ehDespesa = campoTipo.value === 'despesa'

    const container = campoLimite.closest('.campo') || campoLimiteContainer

    container.hidden = !ehDespesa
    campoLimite.required = ehDespesa
}

async function carregarCategorias() {
    categorias = await requisicao('/categorias')

    const despesas = categorias.filter(categoria => categoria.tipo === 'despesa')

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

async function carregarCaixas() {
    caixas = await requisicao('/caixas')

    atualizarResumo()
    atualizarSeletores()
    renderizarCaixas()
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

function atualizarSeletores() {
    const despesas = caixas.filter(caixa => caixa.tipo === 'despesa')
    const reservas = caixas.filter(caixa => caixa.tipo === 'reserva')

    campoCaixaVinculo.innerHTML =
        '<option value="">Selecione uma caixa</option>' +
        despesas.map(caixa => `
            <option value="${Number(caixa.id)}">
                ${escaparHTML(caixa.nome)}
            </option>
        `).join('')

    campoCaixaMovimentacao.innerHTML =
        '<option value="">Selecione uma reserva</option>' +
        reservas.map(caixa => `
            <option value="${Number(caixa.id)}">
                ${escaparHTML(caixa.nome)} - ${moeda(caixa.saldo)}
            </option>
        `).join('')
}

function renderizarCaixas() {
    const pesquisa = document.getElementById('pesquisa').value.trim().toLowerCase()
    const filtroTipo = document.getElementById('filtroTipo').value

    const filtradas = caixas.filter(caixa => {
        const correspondeNome = caixa.nome.toLowerCase().includes(pesquisa)
        const correspondeTipo = filtroTipo === 'todos' || caixa.tipo === filtroTipo

        return correspondeNome && correspondeTipo
    })

    document.getElementById('quantidadeRegistros').textContent =
        `${filtradas.length} ${filtradas.length === 1 ? 'caixa' : 'caixas'}`

    if (!filtradas.length) {
        lista.innerHTML = '<p class="estado-vazio">Nenhuma caixa encontrada.</p>'
        return
    }

    lista.innerHTML = filtradas.map(caixa => {
        if (caixa.tipo === 'reserva') {
            return renderizarReserva(caixa)
        }

        return renderizarDespesa(caixa)
    }).join('')
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

    const categoriasCaixa = caixa.categorias || []

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
                <span class="${classe}" style="width:${Math.min(percentual, 100)}%"></span>
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
                <button class="botao-editar" data-acao="editar" data-id="${Number(caixa.id)}">Editar</button>
                <button class="botao-excluir" data-acao="excluir" data-id="${Number(caixa.id)}">Excluir</button>
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
                <button class="botao-historico" data-acao="historico" data-id="${Number(caixa.id)}">Histórico</button>
                <button class="botao-editar" data-acao="editar" data-id="${Number(caixa.id)}">Editar</button>
                <button class="botao-excluir" data-acao="excluir" data-id="${Number(caixa.id)}">Excluir</button>
            </div>
        </article>
    `
}

function limparFormulario() {
    formCaixa.reset()
    campoId.value = ''

    document.getElementById('tituloFormulario').textContent = 'Nova caixa'
    btnSalvar.textContent = 'Criar caixa'
    btnCancelar.hidden = true

    atualizarCampoLimite()
    mostrarMensagem(mensagem, '')
}

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
        return
    }

    if (tipo === 'despesa' && (!Number.isFinite(dados.limiteMensal) || dados.limiteMensal <= 0)) {
        mostrarMensagem(mensagem, 'Informe um limite mensal válido.', 'erro')
        return
    }

    btnSalvar.disabled = true
    mostrarMensagem(mensagem, '')

    try {
        await requisicao(id ? `/caixas/${id}` : '/caixas', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(dados)
        })

        mostrarMensagem(
            mensagem,
            id ? 'Caixa atualizada com sucesso.' : 'Caixa criada com sucesso.',
            'sucesso'
        )

        limparFormulario()
        await carregarCaixas()
    } catch (erro) {
        mostrarMensagem(mensagem, erro.message, 'erro')
    } finally {
        btnSalvar.disabled = false
    }
})

btnCancelar.addEventListener('click', limparFormulario)

formVinculo.addEventListener('submit', async evento => {
    evento.preventDefault()

    const categoriaId = Number(campoCategoriaVinculo.value)
    const caixaId = Number(campoCaixaVinculo.value)

    const categoria = categorias.find(item => item.id === categoriaId)

    if (!categoria || !caixaId) {
        mostrarMensagem(mensagemVinculo, 'Selecione uma categoria e uma caixa.', 'erro')
        return
    }

    try {
        await requisicao(`/categorias/${categoriaId}`, {
            method: 'PUT',
            body: JSON.stringify({
                nome: categoria.nome,
                tipo: categoria.tipo,
                caixaId
            })
        })

        mostrarMensagem(mensagemVinculo, 'Categoria vinculada com sucesso.', 'sucesso')

        await carregarCategorias()
        await carregarCaixas()

        campoCategoriaVinculo.value = ''
        campoCaixaVinculo.value = ''
    } catch (erro) {
        mostrarMensagem(mensagemVinculo, erro.message, 'erro')
    }
})

formMovimentacao.addEventListener('submit', async evento => {
    evento.preventDefault()

    const caixaId = Number(campoCaixaMovimentacao.value)

    const dados = {
        tipo: campoTipoMovimentacao.value,
        valor: Number(campoValorMovimentacao.value),
        descricao: campoDescricaoMovimentacao.value.trim()
    }

    if (!caixaId || !Number.isFinite(dados.valor) || dados.valor <= 0) {
        mostrarMensagem(mensagemMovimentacao, 'Informe uma reserva e um valor válido.', 'erro')
        return
    }

    const btn = document.getElementById('btnMovimentar')
    btn.disabled = true

    try {
        await requisicao(`/caixas/${caixaId}/movimentacoes`, {
            method: 'POST',
            body: JSON.stringify(dados)
        })

        formMovimentacao.reset()

        mostrarMensagem(
            mensagemMovimentacao,
            dados.tipo === 'deposito'
                ? 'Depósito registrado com sucesso.'
                : 'Retirada registrada com sucesso.',
            'sucesso'
        )

        await carregarCaixas()
    } catch (erro) {
        mostrarMensagem(mensagemMovimentacao, erro.message, 'erro')
    } finally {
        btn.disabled = false
    }
})

lista.addEventListener('click', async evento => {
    const botao = evento.target.closest('button[data-acao]')

    if (!botao) return

    const id = Number(botao.dataset.id)
    const caixa = caixas.find(item => item.id === id)

    if (!caixa) return

    if (botao.dataset.acao === 'editar') {
        campoId.value = caixa.id
        campoNome.value = caixa.nome
        campoTipo.value = caixa.tipo
        campoLimite.value = caixa.limiteMensal ?? ''

        document.getElementById('tituloFormulario').textContent = 'Editar caixa'
        btnSalvar.textContent = 'Salvar alterações'
        btnCancelar.hidden = false

        atualizarCampoLimite()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
    }

    if (botao.dataset.acao === 'excluir') {
        const confirmacao = caixa.tipo === 'reserva'
            ? `Deseja excluir a reserva "${caixa.nome}"? O histórico de depósitos e retiradas também será excluído.`
            : `Deseja excluir a caixa "${caixa.nome}"? As categorias vinculadas ficarão sem caixa.`

        if (!confirm(confirmacao)) return

        botao.disabled = true

        try {
            await requisicao(`/caixas/${id}`, {
                method: 'DELETE'
            })

            if (campoId.value === String(id)) {
                limparFormulario()
            }

            mostrarMensagem(mensagem, 'Caixa excluída com sucesso.', 'sucesso')
            await carregarCategorias()
            await carregarCaixas()
        } catch (erro) {
            mostrarMensagem(mensagem, erro.message, 'erro')
        } finally {
            botao.disabled = false
        }
    }

    if (botao.dataset.acao === 'historico') {
        await carregarHistorico(caixa)
    }
})

async function carregarHistorico(caixa) {
    painelHistorico.hidden = false

    document.getElementById('tituloHistorico').textContent =
        `Histórico: ${caixa.nome}`

    listaHistorico.innerHTML = `
        <tr>
            <td colspan="4" class="estado-vazio">Carregando histórico...</td>
        </tr>
    `

    painelHistorico.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    })

    try {
        const movimentacoes = await requisicao(
            `/caixas/${caixa.id}/movimentacoes`
        )

        if (!movimentacoes.length) {
            listaHistorico.innerHTML = `
                <tr>
                    <td colspan="4" class="estado-vazio">Nenhuma movimentação registrada.</td>
                </tr>
            `
            return
        }

        listaHistorico.innerHTML = movimentacoes.map(item => {
            const data = new Date(item.data).toLocaleDateString('pt-BR')
            const deposito = item.tipo === 'deposito'

            return `
                <tr>
                    <td>${data}</td>
                    <td>${deposito ? 'Depósito' : 'Retirada'}</td>
                    <td>${escaparHTML(item.descricao || 'Sem descrição')}</td>
                    <td class="${deposito ? 'valor-positivo' : 'valor-negativo'}">
                        ${deposito ? '+' : '-'} ${moeda(item.valor)}
                    </td>
                </tr>
            `
        }).join('')
    } catch (erro) {
        listaHistorico.innerHTML = `
            <tr>
                <td colspan="4" class="estado-vazio">${escaparHTML(erro.message)}</td>
            </tr>
        `
    }
}

document.getElementById('btnFecharHistorico').addEventListener('click', () => {
    painelHistorico.hidden = true
})

document.getElementById('pesquisa').addEventListener('input', renderizarCaixas)
document.getElementById('filtroTipo').addEventListener('change', renderizarCaixas)

document.getElementById('btnSair').addEventListener('click', async evento => {
    evento.preventDefault()

    try {
        await requisicao('/auth/logout', {
            method: 'POST'
        })

        window.location.href = '/html/login.html'
    } catch (erro) {
        mostrarMensagem(mensagem, erro.message, 'erro')
    }
})

async function iniciar() {
    atualizarCampoLimite()

    lista.innerHTML = '<p class="estado-vazio">Carregando caixas...</p>'

    try {
        await carregarCategorias()
        await carregarCaixas()
    } catch (erro) {
        lista.innerHTML = `
            <p class="estado-vazio">${escaparHTML(erro.message)}</p>
        `
    }
}

iniciar()
