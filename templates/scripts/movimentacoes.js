
const formMovimentacao = document.getElementById('formMovimentacao')
const listaMovimentacoes = document.getElementById('listaMovimentacoes')
const mensagem = document.getElementById('mensagem')
const pesquisa = document.getElementById('pesquisa')
const filtroTipo = document.getElementById('filtroTipo')
const movimentacaoId = document.getElementById('movimentacaoId')
const descricao = document.getElementById('descricao')
const valor = document.getElementById('valor')
const tipo = document.getElementById('tipo')
const categoria = document.getElementById('categoria')
const data = document.getElementById('data')
const tituloFormulario = document.getElementById('tituloFormulario')
const btnSalvar = document.getElementById('btnSalvar')
const btnCancelar = document.getElementById('btnCancelar')
const btnSair = document.getElementById('btnSair')

let movimentacoes = []
let categorias = []

document.getElementById('dataAtual').textContent =
    new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })

function formatarMoeda(numero) {
    return Number(numero).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

function formatarData(dataRecebida) {
    if (!dataRecebida) return '-'

    const dataISO = new Date(dataRecebida)

    if (Number.isNaN(dataISO.getTime())) return '-'

    return dataISO.toLocaleDateString('pt-BR', {
        timeZone: 'UTC'
    })
}

function dataHoje() {
    const agora = new Date()

    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

function mostrarMensagem(texto, classe = '') {
    mensagem.textContent = texto
    mensagem.className = `mensagem ${classe}`.trim()
}

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        credentials: 'same-origin',
        ...opcoes,
        headers: {
            ...(opcoes.body ? {
                'Content-Type': 'application/json'
            } : {}),
            ...(opcoes.headers || {})
        }
    })

    if (resposta.status === 401) {
        window.location.href = '/html/login.html'
        throw new Error('Sua sessão expirou. Entre novamente.')
    }

    const resultado = await resposta.json().catch(() => ({}))

    if (!resposta.ok) {
        throw new Error(
            resultado.mensagem || 'Não foi possível concluir a operação.'
        )
    }

    return resultado
}

// Preencher o seletor com as categorias do tipo escolhido
function atualizarCategorias(categoriaSelecionada = '') {
    const tipoSelecionado = tipo.value

    const categoriasFiltradas = categorias.filter(item =>
        item.tipo === tipoSelecionado
    )

    categoria.replaceChildren()

    const opcaoInicial = document.createElement('option')
    opcaoInicial.value = ''
    opcaoInicial.textContent = 'Selecione uma categoria'

    categoria.appendChild(opcaoInicial)

    categoriasFiltradas.forEach(item => {
        const opcao = document.createElement('option')

        opcao.value = item.id
        opcao.textContent = item.nome

        categoria.appendChild(opcao)
    })

    if (categoriasFiltradas.length === 0) {
        opcaoInicial.textContent = 'Nenhuma categoria cadastrada'
    }

    categoria.value = String(categoriaSelecionada || '')
}

// Buscar categorias cadastradas
async function carregarCategorias() {
    try {
        categorias = await requisicao('/categorias')

        if (!Array.isArray(categorias)) {
            categorias = []
        }

        atualizarCategorias()
    } catch (erro) {
        mostrarMensagem(
            `Não foi possível carregar as categorias: ${erro.message}`,
            'erro'
        )
    }
}

function atualizarResumo(lista) {
    const receitas = lista
        .filter(item => item.tipo === 'receita')
        .reduce((soma, item) => soma + Number(item.valor), 0)

    const despesas = lista
        .filter(item => item.tipo === 'despesa')
        .reduce((soma, item) => soma + Number(item.valor), 0)

    document.getElementById('totalReceitas').textContent =
        formatarMoeda(receitas)

    document.getElementById('totalDespesas').textContent =
        formatarMoeda(despesas)

    document.getElementById('saldoMovimentacoes').textContent =
        formatarMoeda(receitas - despesas)
}

function criarCelula(texto) {
    const celula = document.createElement('td')
    celula.textContent = texto ?? '-'
    return celula
}

function renderizarMovimentacoes() {
    const termo = pesquisa.value.trim().toLocaleLowerCase('pt-BR')
    const tipoSelecionado = filtroTipo.value

    const filtradas = movimentacoes.filter(item => {
        const nomeCategoria =
            item.categoriaRef?.nome || item.categoria || ''

        const correspondeTexto =
            (item.descricao || '').toLocaleLowerCase('pt-BR').includes(termo) ||
            nomeCategoria.toLocaleLowerCase('pt-BR').includes(termo)

        return correspondeTexto &&
            (tipoSelecionado === 'todos' || item.tipo === tipoSelecionado)
    })

    listaMovimentacoes.replaceChildren()

    document.getElementById('quantidadeRegistros').textContent =
        `${filtradas.length} ${filtradas.length === 1 ? 'registro' : 'registros'}`

    if (filtradas.length === 0) {
        const linha = document.createElement('tr')
        const celula = document.createElement('td')

        celula.colSpan = 6
        celula.className = 'estado-vazio'

        celula.textContent = movimentacoes.length
            ? 'Nenhuma movimentação corresponde à pesquisa.'
            : 'Você ainda não cadastrou movimentações.'

        linha.appendChild(celula)
        listaMovimentacoes.appendChild(linha)

        atualizarResumo(movimentacoes)
        return
    }

    filtradas.forEach(item => {
        const linha = document.createElement('tr')

        const nomeCategoria =
            item.categoriaRef?.nome || item.categoria || '-'

        linha.appendChild(criarCelula(item.descricao))
        linha.appendChild(criarCelula(nomeCategoria))
        linha.appendChild(criarCelula(formatarData(item.data)))

        const celulaTipo = document.createElement('td')
        const etiquetaTipo = document.createElement('span')

        etiquetaTipo.className = `tipo ${item.tipo}`
        etiquetaTipo.textContent =
            item.tipo === 'receita' ? 'Receita' : 'Despesa'

        celulaTipo.appendChild(etiquetaTipo)
        linha.appendChild(celulaTipo)

        const celulaValor = document.createElement('td')

        celulaValor.className = `valor ${item.tipo}`
        celulaValor.textContent =
            `${item.tipo === 'receita' ? '+' : '-'} ${formatarMoeda(item.valor)}`

        linha.appendChild(celulaValor)

        const celulaAcoes = document.createElement('td')

        const botaoEditar = document.createElement('button')
        botaoEditar.type = 'button'
        botaoEditar.className = 'acao-tabela'
        botaoEditar.textContent = 'Editar'
        botaoEditar.addEventListener('click', () => {
            editarMovimentacao(item)
        })

        const botaoExcluir = document.createElement('button')
        botaoExcluir.type = 'button'
        botaoExcluir.className = 'acao-tabela excluir'
        botaoExcluir.textContent = 'Excluir'
        botaoExcluir.addEventListener('click', () => {
            excluirMovimentacao(item.id)
        })

        celulaAcoes.append(botaoEditar, botaoExcluir)
        linha.appendChild(celulaAcoes)

        listaMovimentacoes.appendChild(linha)
    })

    atualizarResumo(movimentacoes)
}

async function carregarMovimentacoes() {
    try {
        movimentacoes = await requisicao('/movimentacoes')
        renderizarMovimentacoes()
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro')

        listaMovimentacoes.replaceChildren()

        const linha = document.createElement('tr')
        const celula = document.createElement('td')

        celula.colSpan = 6
        celula.className = 'estado-vazio'
        celula.textContent =
            'Não foi possível carregar as movimentações.'

        linha.appendChild(celula)
        listaMovimentacoes.appendChild(linha)
    }
}

function limparFormulario() {
    formMovimentacao.reset()

    movimentacaoId.value = ''
    data.value = dataHoje()

    tituloFormulario.textContent = 'Nova movimentação'
    btnSalvar.textContent = 'Salvar movimentação'
    btnCancelar.hidden = true

    atualizarCategorias()
}

function editarMovimentacao(item) {
    movimentacaoId.value = item.id
    descricao.value = item.descricao
    valor.value = item.valor
    tipo.value = item.tipo

    atualizarCategorias(item.categoriaId)

    data.value = new Date(item.data).toISOString().slice(0, 10)

    tituloFormulario.textContent = 'Editar movimentação'
    btnSalvar.textContent = 'Salvar alterações'
    btnCancelar.hidden = false

    mostrarMensagem('Você está editando uma movimentação.')

    formMovimentacao.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    })

    descricao.focus()
}

formMovimentacao.addEventListener('submit', async evento => {
    evento.preventDefault()
    mostrarMensagem('')

    const id = movimentacaoId.value

    const dados = {
        descricao: descricao.value.trim(),
        valor: Number(valor.value),
        tipo: tipo.value,
        categoriaId: Number(categoria.value),
        data: data.value
    }

    if (
        !dados.descricao ||
        !dados.categoriaId ||
        !Number.isFinite(dados.valor) ||
        dados.valor <= 0 ||
        !dados.data
    ) {
        mostrarMensagem('Preencha todos os campos corretamente.', 'erro')
        return
    }

    btnSalvar.disabled = true

    try {
        await requisicao(
            id ? `/movimentacoes/${id}` : '/movimentacoes',
            {
                method: id ? 'PUT' : 'POST',
                body: JSON.stringify(dados)
            }
        )

        mostrarMensagem(
            id
                ? 'Movimentação atualizada com sucesso!'
                : 'Movimentação cadastrada com sucesso!',
            'sucesso'
        )

        limparFormulario()
        await carregarMovimentacoes()
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro')
    } finally {
        btnSalvar.disabled = false
    }
})

async function excluirMovimentacao(id) {
    if (!window.confirm('Deseja realmente excluir esta movimentação?')) {
        return
    }

    try {
        await requisicao(`/movimentacoes/${id}`, {
            method: 'DELETE'
        })

        mostrarMensagem('Movimentação excluída com sucesso!', 'sucesso')

        if (movimentacaoId.value === String(id)) {
            limparFormulario()
        }

        await carregarMovimentacoes()
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro')
    }
}

btnCancelar.addEventListener('click', () => {
    limparFormulario()
    mostrarMensagem('')
})

// Atualizar categorias quando o tipo mudar
tipo.addEventListener('change', () => {
    atualizarCategorias()
})

pesquisa.addEventListener('input', renderizarMovimentacoes)
filtroTipo.addEventListener('change', renderizarMovimentacoes)

btnSair.addEventListener('click', async evento => {
    evento.preventDefault()

    try {
        await requisicao('/auth/logout', {
            method: 'POST'
        })

        window.location.href = '/html/login.html'
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro')
    }
})

async function iniciarPagina() {
    data.value = dataHoje()

    await carregarCategorias()
    await carregarMovimentacoes()
}

iniciarPagina()
