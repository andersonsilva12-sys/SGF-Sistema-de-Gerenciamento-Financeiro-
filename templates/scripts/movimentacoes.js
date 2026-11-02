
const formMovimentacao = document.getElementById('formMovimentacao')
const mensagem = document.getElementById('mensagem')
const mensagemGlobal = document.getElementById('mensagemGlobal')
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
const modalMovimentacao = document.getElementById('modalMovimentacao')
const btnNovaMovimentacao = document.getElementById('btnNovaMovimentacao')
const btnFecharModal = document.getElementById('btnFecharModal')
const btnSair = document.getElementById('btnSair')

let movimentacoes = []
let categorias = []
let mesModalAberto = null
let mesParaReabrir = null

// Por padrão, o resumo apresenta o mês atual no horário local do usuário.
let mesResumoSelecionado = (() => {
    const agora = new Date()
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
})()

const elementoDataAtual = document.getElementById('dataAtual')

if (elementoDataAtual) {
    elementoDataAtual.textContent = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })
}

// Adiciona os estilos dos quadrantes e do pop-up mensal.
function adicionarEstilosHistorico() {
    if (document.getElementById('estilosHistoricoMensal')) return

    const estilo = document.createElement('style')
    estilo.id = 'estilosHistoricoMensal'

    estilo.textContent = `
        .tabela-container.container-quadrantes {
            overflow: visible;
            border: 0;
            border-radius: 0;
            background: transparent;
        }

        .quadrantes-meses {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 18px;
            align-items: stretch;
        }

        .quadrante-mes {
            min-width: 0;
            display: flex;
            flex-direction: column;
            padding: 20px;
            border: 1px solid var(--borda, #dbe2e8);
            border-radius: 12px;
            background: var(--superficie, #fff);
            box-shadow: 0 3px 12px rgba(15, 23, 42, .04);
        }

        .quadrante-cabecalho {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
        }

        .quadrante-cabecalho h3 {
            margin: 0 0 5px;
            color: var(--azul, #23384d);
            font-size: 17px;
            text-transform: capitalize;
        }

        .quadrante-cabecalho p {
            margin: 0;
            color: var(--texto-suave, #687789);
            font-size: 12px;
        }

        .quadrante-contador {
            flex-shrink: 0;
            padding: 5px 8px;
            border-radius: 999px;
            background: var(--fundo, #f1f5f9);
            color: var(--texto-suave, #526273);
            font-size: 11px;
            white-space: nowrap;
        }

        .quadrante-lista {
            display: flex;
            flex-direction: column;
            flex: 1;
        }

        .quadrante-movimento {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            align-items: start;
            padding: 12px 0;
            border-top: 1px solid var(--borda, #e4e9ee);
        }

        .quadrante-movimento:first-child {
            border-top: 0;
        }

        .quadrante-movimento strong {
            display: block;
            overflow-wrap: anywhere;
            color: var(--texto, #253242);
            font-size: 13px;
        }

        .quadrante-movimento small {
            display: block;
            margin-top: 4px;
            color: var(--texto-suave, #687789);
            font-size: 11px;
            line-height: 1.4;
        }

        .quadrante-valor {
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
        }

        .quadrante-valor.receita,
        #modalHistoricoMes .historico-valor.receita {
            color: #238653;
        }

        .quadrante-valor.despesa,
        #modalHistoricoMes .historico-valor.despesa {
            color: #c16b52;
        }

        .quadrante-vazio {
            padding: 18px 12px;
            color: var(--texto-suave, #687789);
            text-align: center;
            font-size: 13px;
            border: 1px dashed var(--borda, #dbe2e8);
            border-radius: 10px;
        }

        .acoes-quadrante {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 16px;
        }

        .botao-quadrante {
            padding: 9px 13px;
            border: 1px solid var(--borda, #dbe2e8);
            border-radius: 7px;
            background: var(--superficie, #fff);
            color: var(--texto, #253242);
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
        }

        .botao-quadrante.ver {
            border-color: var(--azul, #23384d);
            background: var(--azul, #23384d);
            color: #fff;
        }

        .botao-quadrante.excluir {
            border-color: #f0c9c5;
            background: #fff4f3;
            color: #b73535;
        }

        .botao-quadrante:disabled {
            opacity: .6;
            cursor: wait;
        }

        #modalHistoricoMes {
            position: fixed;
            inset: 0;
            margin: auto;
            width: calc(100% - 32px);
            max-width: 1100px;
            max-height: 88vh;
            max-height: 88dvh;
            overflow: auto;
            padding: 26px;
            border: 1px solid var(--borda, #dbe2e8);
            border-radius: 16px;
            background: var(--superficie, #fff);
            color: var(--texto, #253242);
            box-shadow: 0 20px 60px rgba(0, 0, 0, .28);
        }

        #modalHistoricoMes:not([open]) {
            display: none;
        }

        #modalHistoricoMes::backdrop {
            background: rgba(15, 23, 42, .62);
            backdrop-filter: blur(3px);
        }

        .historico-modal-cabecalho {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 18px;
        }

        .historico-modal-cabecalho h2 {
            margin: 0 0 7px;
            color: var(--azul, #23384d);
            text-transform: capitalize;
        }

        .historico-modal-cabecalho p {
            margin: 0;
            color: var(--texto-suave, #687789);
            font-size: 13px;
        }

        .historico-modal-acoes {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            align-items: center;
            gap: 8px;
        }

        .historico-modal-fechar {
            width: 36px;
            height: 36px;
            border: 1px solid var(--borda, #dbe2e8);
            border-radius: 8px;
            background: var(--superficie, #fff);
            color: var(--texto, #253242);
            font-size: 24px;
            cursor: pointer;
        }

        .historico-tabela-container {
            width: 100%;
            overflow-x: auto;
            border: 1px solid var(--borda, #dbe2e8);
            border-radius: 9px;
        }

        #modalHistoricoMes table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            text-align: left;
        }

        #modalHistoricoMes th {
            padding: 12px;
            background: var(--fundo, #f1f5f9);
            color: var(--texto-suave, #526273);
            font-size: 11px;
            text-transform: uppercase;
            white-space: nowrap;
        }

        #modalHistoricoMes td {
            padding: 12px;
            border-top: 1px solid var(--borda, #e4e9ee);
            vertical-align: middle;
        }

        #modalHistoricoMes .historico-valor {
            font-weight: bold;
        }

        #modalHistoricoMes .historico-estado-vazio {
            padding: 24px;
            text-align: center;
            color: var(--texto-suave, #687789);
        }

        #modalHistoricoMes .historico-resumo-mes {
            display: flex;
            flex-wrap: wrap;
            gap: 12px 24px;
            margin: 16px 0;
            font-size: 13px;
        }

        #modalHistoricoMes .historico-resumo-mes strong {
            color: var(--azul, #23384d);
        }

        @media (max-width: 650px) {
            .quadrantes-meses {
                grid-template-columns: 1fr;
            }

            #modalHistoricoMes {
                width: calc(100% - 20px);
                max-height: 92vh;
                max-height: 92dvh;
                padding: 17px;
            }

            .historico-modal-cabecalho {
                flex-direction: column;
            }

            .historico-modal-acoes {
                width: 100%;
                justify-content: space-between;
            }
        }
    `

    document.head.appendChild(estilo)
}

// Formatar valores monetários.
function formatarMoeda(numero) {
    return Number(numero).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

// Formatar datas sem deslocar o dia das datas no formato YYYY-MM-DD.
function formatarData(dataRecebida) {
    if (!dataRecebida) return '-'

    const textoData = String(dataRecebida)

    if (/^\d{4}-\d{2}-\d{2}/.test(textoData)) {
        const [ano, mes, dia] = textoData.slice(0, 10).split('-')
        return `${dia}/${mes}/${ano}`
    }

    const dataConvertida = new Date(dataRecebida)

    if (Number.isNaN(dataConvertida.getTime())) return '-'

    return dataConvertida.toLocaleDateString('pt-BR')
}

// Data de hoje no formato exigido pelo input date.
function dataHoje() {
    const agora = new Date()

    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

// Retornar o ano e mês da movimentação no formato YYYY-MM.
function chaveMes(dataRecebida) {
    if (!dataRecebida) return null

    const texto = String(dataRecebida)

    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
        return texto.slice(0, 7)
    }

    const dataConvertida = new Date(dataRecebida)

    if (Number.isNaN(dataConvertida.getTime())) return null

    return `${dataConvertida.getUTCFullYear()}-${String(dataConvertida.getUTCMonth() + 1).padStart(2, '0')}`
}

// Exibir o mês, por exemplo: Janeiro de 2026.
function nomeMes(chave) {
    const dataMes = new Date(`${chave}-01T12:00:00`)

    const nome = dataMes.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    })

    return nome.charAt(0).toLocaleUpperCase('pt-BR') + nome.slice(1)
}

function ordenarPorDataDesc(lista) {
    return [...lista].sort((a, b) => {
        const dataA = new Date(a.data).getTime() || 0
        const dataB = new Date(b.data).getTime() || 0

        return dataB - dataA || Number(b.id) - Number(a.id)
    })
}

// Exibir mensagens na página e no formulário.
function mostrarMensagem(texto, classe = '') {
    if (mensagem) {
        mensagem.textContent = texto
        mensagem.className = `mensagem ${classe}`.trim()
    }

    if (mensagemGlobal) {
        mensagemGlobal.textContent = texto
        mensagemGlobal.className = `mensagem ${classe}`.trim()
    }
}

function mostrarMensagemNoModalMes(texto, classe = '') {
    const area = document.getElementById('mensagemHistoricoMes')

    if (!area) return

    area.textContent = texto
    area.className = `mensagem ${classe}`.trim()
}

// Requisições ao backend existente.
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
            resultado.mensagem ||
            'Não foi possível concluir a operação.'
        )
    }

    return resultado
}

// Atualizar as categorias de acordo com o tipo escolhido.
function atualizarCategorias(categoriaSelecionada = '') {
    const tipoSelecionado = tipo.value

    const categoriasFiltradas = categorias.filter(item =>
        item.tipo === tipoSelecionado
    )

    categoria.replaceChildren()

    const opcaoInicial = document.createElement('option')
    opcaoInicial.value = ''
    opcaoInicial.textContent = categoriasFiltradas.length
        ? 'Selecione uma categoria'
        : 'Nenhuma categoria cadastrada'

    categoria.appendChild(opcaoInicial)

    categoriasFiltradas.forEach(item => {
        const opcao = document.createElement('option')

        opcao.value = item.id
        opcao.textContent = item.nome

        categoria.appendChild(opcao)
    })

    categoria.value = String(categoriaSelecionada || '')
}

// Carregar categorias do banco de dados.
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

// Calcular receitas, despesas e saldo.
function calcularTotais(lista) {
    const receitas = lista
        .filter(item => item.tipo === 'receita')
        .reduce((soma, item) => soma + Number(item.valor), 0)

    const despesas = lista
        .filter(item => item.tipo === 'despesa')
        .reduce((soma, item) => soma + Number(item.valor), 0)

    return {
        receitas,
        despesas,
        saldo: receitas - despesas
    }
}

// Atualizar os indicadores financeiros somente com o mês selecionado.
function atualizarResumo(lista) {
    const movimentacoesDoMes = lista.filter(item =>
        chaveMes(item.data) === mesResumoSelecionado
    )

    const totais = calcularTotais(movimentacoesDoMes)

    document.getElementById('totalReceitas').textContent =
        formatarMoeda(totais.receitas)

    document.getElementById('totalDespesas').textContent =
        formatarMoeda(totais.despesas)

    document.getElementById('saldoMovimentacoes').textContent =
        formatarMoeda(totais.saldo)

    const tituloMes = document.getElementById('mesResumoAtual')

    if (tituloMes) {
        tituloMes.textContent = nomeMes(mesResumoSelecionado)
    }

    const seletorMes = document.getElementById('seletorMesResumo')

    if (seletorMes && seletorMes.value !== mesResumoSelecionado) {
        seletorMes.value = mesResumoSelecionado
    }
}

// Agrupar as movimentações utilizando o mês da data de cada registro.
function obterGruposPorMes() {
    const grupos = new Map()

    movimentacoes.forEach(item => {
        const chave = chaveMes(item.data)

        if (!chave) return

        if (!grupos.has(chave)) {
            grupos.set(chave, [])
        }

        grupos.get(chave).push(item)
    })

    for (const [chave, itens] of grupos.entries()) {
        grupos.set(chave, ordenarPorDataDesc(itens))
    }

    return grupos
}

// Manter a pesquisa e o filtro por tipo.
function correspondeFiltros(item) {
    const termo = pesquisa.value.trim().toLocaleLowerCase('pt-BR')
    const tipoSelecionado = filtroTipo.value

    const nomeCategoria =
        item.categoriaRef?.nome || item.categoria || ''

    const correspondeTexto =
        (item.descricao || '').toLocaleLowerCase('pt-BR').includes(termo) ||
        nomeCategoria.toLocaleLowerCase('pt-BR').includes(termo)

    return correspondeTexto &&
        (tipoSelecionado === 'todos' || item.tipo === tipoSelecionado)
}

// Criar uma das três movimentações exibidas no quadrante.
function criarPreviewMovimentacao(item) {
    const linha = document.createElement('div')
    linha.className = 'quadrante-movimento'

    const detalhes = document.createElement('div')

    const titulo = document.createElement('strong')
    titulo.textContent = item.descricao || 'Sem descrição'

    const subtitulo = document.createElement('small')
    const nomeCategoria =
        item.categoriaRef?.nome || item.categoria || 'Sem categoria'

    subtitulo.textContent =
        `${formatarData(item.data)} · ${nomeCategoria}`

    detalhes.append(titulo, subtitulo)

    const dinheiro = document.createElement('span')
    dinheiro.className = `quadrante-valor ${item.tipo}`

    dinheiro.textContent =
        `${item.tipo === 'receita' ? '+' : '-'} ${formatarMoeda(item.valor)}`

    linha.append(detalhes, dinheiro)

    return linha
}

// Montar o quadrante de um mês.
function criarQuadranteMes(chave, itens, itensVisiveis) {
    const artigo = document.createElement('article')
    artigo.className = 'quadrante-mes'

    const cabecalho = document.createElement('div')
    cabecalho.className = 'quadrante-cabecalho'

    const textos = document.createElement('div')

    const titulo = document.createElement('h3')
    titulo.textContent = nomeMes(chave)

    const subtitulo = document.createElement('p')
    subtitulo.textContent = 'Movimentações recentes do mês'

    textos.append(titulo, subtitulo)

    const contador = document.createElement('span')
    contador.className = 'quadrante-contador'
    contador.textContent =
        `${itens.length} ${itens.length === 1 ? 'movimentação' : 'movimentações'}`

    cabecalho.append(textos, contador)

    const lista = document.createElement('div')
    lista.className = 'quadrante-lista'

    ordenarPorDataDesc(itensVisiveis)
        .slice(0, 3)
        .forEach(item => {
            lista.appendChild(criarPreviewMovimentacao(item))
        })

    if (itensVisiveis.length === 0) {
        const vazio = document.createElement('p')
        vazio.className = 'quadrante-vazio'
        vazio.textContent = 'Nenhum resultado com os filtros atuais.'
        lista.appendChild(vazio)
    }

    const acoes = document.createElement('div')
    acoes.className = 'acoes-quadrante'

    const botaoVer = document.createElement('button')
    botaoVer.type = 'button'
    botaoVer.className = 'botao-quadrante ver'
    botaoVer.textContent = 'Ver'
    botaoVer.addEventListener('click', () => abrirModalMes(chave))

    const botaoExcluir = document.createElement('button')
    botaoExcluir.type = 'button'
    botaoExcluir.className = 'botao-quadrante excluir'
    botaoExcluir.textContent = 'Excluir'

    botaoExcluir.addEventListener('click', () => {
        excluirQuadranteMes(chave, botaoExcluir)
    })

    acoes.append(botaoVer, botaoExcluir)
    artigo.append(cabecalho, lista, acoes)

    return artigo
}

// Renderizar os quadrantes no Histórico.
function renderizarQuadrantes() {
    const container = document.getElementById('quadrantesMeses')

    if (!container) return

    container.replaceChildren()

    const grupos = obterGruposPorMes()
    let mesesVisiveis = 0
    let movimentacoesCorrespondentes = 0

    const chaves = [...grupos.keys()].sort((a, b) => b.localeCompare(a))

    chaves.forEach(chave => {
        const itens = grupos.get(chave)
        const itensVisiveis = itens.filter(correspondeFiltros)

        if (itensVisiveis.length === 0) return

        mesesVisiveis += 1
        movimentacoesCorrespondentes += itensVisiveis.length

        container.appendChild(
            criarQuadranteMes(chave, itens, itensVisiveis)
        )
    })

    const quantidade = document.getElementById('quantidadeRegistros')

    if (quantidade) {
        quantidade.textContent =
            `${mesesVisiveis} ${mesesVisiveis === 1 ? 'mês' : 'meses'} · ` +
            `${movimentacoesCorrespondentes} ` +
            `${movimentacoesCorrespondentes === 1 ? 'movimentação' : 'movimentações'}`
    }

    if (mesesVisiveis === 0) {
        const vazio = document.createElement('div')
        vazio.className = 'quadrante-vazio'

        vazio.textContent = movimentacoes.length
            ? 'Nenhum mês possui movimentações que correspondam à pesquisa ou ao filtro.'
            : 'Você ainda não cadastrou movimentações. Clique em “Nova movimentação” para começar.'

        container.appendChild(vazio)
    }
}

// Preparar a estrutura do histórico.
function prepararEstruturaHistorico() {
    adicionarEstilosHistorico()

    const tabelaContainer = document.querySelector('.tabela-container')

    if (tabelaContainer && !document.getElementById('quadrantesMeses')) {
        tabelaContainer.classList.add('container-quadrantes')

        const quadrantes = document.createElement('div')
        quadrantes.id = 'quadrantesMeses'
        quadrantes.className = 'quadrantes-meses'

        tabelaContainer.replaceChildren(quadrantes)
    }

    const listaOriginal = document.getElementById('listaMovimentacoes')

    const secaoHistorico =
        listaOriginal?.closest('section.painel') ||
        document.querySelectorAll('section.painel')[1]

    if (secaoHistorico) {
        const titulo = secaoHistorico.querySelector('.titulo-painel h2')
        const descricaoPainel = secaoHistorico.querySelector('.titulo-painel p')

        if (titulo) titulo.textContent = 'Adicionar Movimentação'

        if (descricaoPainel) {
            descricaoPainel.textContent =
                'Cada quadrante reúne as movimentações de um mês.'
        }
    }

    criarModalHistoricoMes()
}

// Criar o pop-up mensal dinamicamente.
function criarModalHistoricoMes() {
    if (document.getElementById('modalHistoricoMes')) return

    const dialog = document.createElement('dialog')
    dialog.id = 'modalHistoricoMes'
    dialog.setAttribute('aria-labelledby', 'tituloHistoricoMes')

    const cabecalho = document.createElement('div')
    cabecalho.className = 'historico-modal-cabecalho'

    const textos = document.createElement('div')

    const titulo = document.createElement('h2')
    titulo.id = 'tituloHistoricoMes'
    titulo.textContent = 'Movimentações do mês'

    const subtitulo = document.createElement('p')
    subtitulo.id = 'subtituloHistoricoMes'
    subtitulo.textContent = 'Todas as movimentações deste mês.'

    textos.append(titulo, subtitulo)

    const acoesTopo = document.createElement('div')
    acoesTopo.className = 'historico-modal-acoes'

    const botaoPdf = document.createElement('button')
    botaoPdf.id = 'btnBaixarPdfMes'
    botaoPdf.type = 'button'
    botaoPdf.className = 'botao botao-principal'
    botaoPdf.textContent = 'Baixar PDF'
    botaoPdf.addEventListener('click', baixarPdfMesAtual)

    const fechar = document.createElement('button')
    fechar.type = 'button'
    fechar.className = 'historico-modal-fechar'
    fechar.setAttribute('aria-label', 'Fechar histórico mensal')
    fechar.textContent = '×'
    fechar.addEventListener('click', () => dialog.close())

    acoesTopo.append(botaoPdf, fechar)
    cabecalho.append(textos, acoesTopo)

    const mensagemModal = document.createElement('p')
    mensagemModal.id = 'mensagemHistoricoMes'
    mensagemModal.className = 'mensagem'
    mensagemModal.setAttribute('role', 'status')
    mensagemModal.setAttribute('aria-live', 'polite')

    const resumo = document.createElement('div')
    resumo.id = 'resumoHistoricoMes'
    resumo.className = 'historico-resumo-mes'

    const tabelaContainer = document.createElement('div')
    tabelaContainer.className = 'historico-tabela-container'

    const tabela = document.createElement('table')
    const thead = document.createElement('thead')
    const linhaCabecalho = document.createElement('tr')

    ;['Descrição', 'Categoria', 'Data', 'Tipo', 'Valor', 'Ações']
        .forEach(texto => {
            const th = document.createElement('th')
            th.textContent = texto
            linhaCabecalho.appendChild(th)
        })

    thead.appendChild(linhaCabecalho)

    const tbody = document.createElement('tbody')
    tbody.id = 'listaMovimentacoesMes'

    tabela.append(thead, tbody)
    tabelaContainer.appendChild(tabela)

    dialog.append(cabecalho, mensagemModal, resumo, tabelaContainer)
    document.body.appendChild(dialog)

    dialog.addEventListener('close', () => {
        mesModalAberto = null
        mostrarMensagemNoModalMes('')
    })
}

function criarCelula(texto) {
    const celula = document.createElement('td')
    celula.textContent = texto ?? '-'
    return celula
}

// Preencher o pop-up mensal com todos os registros do mês selecionado.
function renderizarDetalhesMes(chave) {
    const dialog = document.getElementById('modalHistoricoMes')
    const titulo = document.getElementById('tituloHistoricoMes')
    const subtitulo = document.getElementById('subtituloHistoricoMes')
    const tbody = document.getElementById('listaMovimentacoesMes')
    const resumo = document.getElementById('resumoHistoricoMes')

    const grupos = obterGruposPorMes()
    const itens = grupos.get(chave) || []

    if (itens.length === 0) {
        if (dialog.open) dialog.close()
        mesModalAberto = null
        return false
    }

    titulo.textContent = nomeMes(chave)

    subtitulo.textContent =
        `${itens.length} ${itens.length === 1 ? 'movimentação registrada' : 'movimentações registradas'} neste mês.`

    tbody.replaceChildren()
    mostrarMensagemNoModalMes('')

    const totais = calcularTotais(itens)
    resumo.replaceChildren()

    ;[
        ['Receitas', totais.receitas],
        ['Despesas', totais.despesas],
        ['Saldo', totais.saldo]
    ].forEach(([rotulo, numero]) => {
        const bloco = document.createElement('span')
        bloco.append(`${rotulo}: `)

        const forte = document.createElement('strong')
        forte.textContent = formatarMoeda(numero)

        bloco.appendChild(forte)
        resumo.appendChild(bloco)
    })

    itens.forEach(item => {
        const linha = document.createElement('tr')

        linha.appendChild(criarCelula(item.descricao))
        linha.appendChild(
            criarCelula(item.categoriaRef?.nome || item.categoria || '-')
        )
        linha.appendChild(criarCelula(formatarData(item.data)))
        linha.appendChild(
            criarCelula(item.tipo === 'receita' ? 'Receita' : 'Despesa')
        )

        const valorCelula = criarCelula(
            `${item.tipo === 'receita' ? '+' : '-'} ${formatarMoeda(item.valor)}`
        )

        valorCelula.className = `historico-valor ${item.tipo}`
        linha.appendChild(valorCelula)

        const acoes = document.createElement('td')

        const editar = document.createElement('button')
        editar.type = 'button'
        editar.className = 'botao-quadrante ver'
        editar.textContent = 'Editar'
        editar.addEventListener('click', () => editarMovimentacao(item))

        const excluir = document.createElement('button')
        excluir.type = 'button'
        excluir.className = 'botao-quadrante excluir'
        excluir.textContent = 'Excluir'
        excluir.addEventListener('click', () => excluirMovimentacao(item.id))

        acoes.append(editar, excluir)
        linha.appendChild(acoes)
        tbody.appendChild(linha)
    })

    return true
}

function abrirModalMes(chave) {
    const dialog = document.getElementById('modalHistoricoMes')

    if (!renderizarDetalhesMes(chave)) return

    mesModalAberto = chave

    if (!dialog.open) {
        dialog.showModal()
    }
}

// Preparar o formulário para um novo registro.
function limparFormulario() {
    formMovimentacao.reset()

    movimentacaoId.value = ''
    data.value = dataHoje()

    tituloFormulario.textContent = 'Nova movimentação'
    btnSalvar.textContent = 'Salvar movimentação'
    btnCancelar.hidden = false

    atualizarCategorias()
}

function abrirModalMovimentacao() {
    mesParaReabrir = null

    limparFormulario()
    mostrarMensagem('')

    if (!modalMovimentacao.open) {
        modalMovimentacao.showModal()
    }

    descricao.focus()
}

function fecharModalMovimentacao() {
    if (modalMovimentacao.open) {
        modalMovimentacao.close()
    }

    limparFormulario()

    if (mensagem) {
        mensagem.textContent = ''
        mensagem.className = 'mensagem'
    }
}

function cancelarFormulario() {
    const mesRetorno = mesParaReabrir
    mesParaReabrir = null

    fecharModalMovimentacao()

    if (mesRetorno) {
        abrirModalMes(mesRetorno)
    }
}

// Editar registros sem criar uma segunda movimentação.
function editarMovimentacao(item) {
    mesParaReabrir = chaveMes(item.data)

    const dialogMes = document.getElementById('modalHistoricoMes')

    if (dialogMes?.open) {
        dialogMes.close()
    }

    movimentacaoId.value = item.id
    descricao.value = item.descricao || ''
    valor.value = item.valor
    tipo.value = item.tipo

    atualizarCategorias(item.categoriaId)

    data.value =
        chaveMes(item.data) && /^\d{4}-\d{2}-\d{2}/.test(String(item.data))
            ? String(item.data).slice(0, 10)
            : new Date(item.data).toISOString().slice(0, 10)

    tituloFormulario.textContent = 'Editar movimentação'
    btnSalvar.textContent = 'Salvar alterações'
    btnCancelar.hidden = false

    mostrarMensagem('Você está editando uma movimentação.')

    if (!modalMovimentacao.open) {
        modalMovimentacao.showModal()
    }

    descricao.focus()
}

// Atualizar o resumo e os quadrantes usando os dados do backend.
async function carregarMovimentacoes() {
    try {
        const resultado = await requisicao('/movimentacoes')

        movimentacoes = Array.isArray(resultado) ? resultado : []

        atualizarResumo(movimentacoes)
        renderizarQuadrantes()

        if (mesModalAberto) {
            const chaveAberta = mesModalAberto
            renderizarDetalhesMes(chaveAberta)
        }
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro')

        const container = document.getElementById('quadrantesMeses')

        if (container) {
            container.replaceChildren()

            const aviso = document.createElement('div')
            aviso.className = 'quadrante-vazio'
            aviso.textContent =
                'Não foi possível carregar as movimentações.'

            container.appendChild(aviso)
        }
    }
}

// Cadastrar uma movimentação ou atualizar uma já existente.
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
        mostrarMensagem(
            'Preencha todos os campos corretamente.',
            'erro'
        )
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

        const deveReabrirMes = Boolean(id && mesParaReabrir)
        const mesAtualizado = chaveMes(dados.data)

        mesParaReabrir = null

        await carregarMovimentacoes()

        if (modalMovimentacao.open) {
            modalMovimentacao.close()
        }

        limparFormulario()

        mostrarMensagem(
            id
                ? 'Movimentação atualizada com sucesso!'
                : 'Movimentação cadastrada com sucesso!',
            'sucesso'
        )

        if (deveReabrirMes && mesAtualizado) {
            abrirModalMes(mesAtualizado)
        }
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro')
    } finally {
        btnSalvar.disabled = false
    }
})

// Excluir uma única movimentação.
async function excluirMovimentacao(id) {
    const item = movimentacoes.find(
        movimento => String(movimento.id) === String(id)
    )

    const chave = item ? chaveMes(item.data) : mesModalAberto

    if (!window.confirm('Deseja realmente excluir esta movimentação?')) {
        return
    }

    try {
        await requisicao(`/movimentacoes/${id}`, {
            method: 'DELETE'
        })

        await carregarMovimentacoes()

        mostrarMensagem(
            'Movimentação excluída com sucesso!',
            'sucesso'
        )

        if (chave && mesModalAberto === chave) {
            abrirModalMes(chave)
        }
    } catch (erro) {
        mostrarMensagemNoModalMes(erro.message, 'erro')
        mostrarMensagem(erro.message, 'erro')
    }
}

// Excluir todas as movimentações de um quadrante mensal.
async function excluirQuadranteMes(chave, botao) {
    const itensDoMes = obterGruposPorMes().get(chave) || []

    if (itensDoMes.length === 0) return

    const confirmar = window.confirm(
        `Tem certeza de que deseja excluir o quadrante ${nomeMes(chave)}?\n\n` +
        `Todas as ${itensDoMes.length} movimentações desse mês serão apagadas permanentemente do banco de dados.`
    )

    if (!confirmar) return

    botao.disabled = true
    botao.textContent = 'Excluindo...'

    let excluidas = 0
    const falhas = []

    // Usa a rota de exclusão já existente para cada registro do mês.
    for (const item of itensDoMes) {
        try {
            await requisicao(`/movimentacoes/${item.id}`, {
                method: 'DELETE'
            })

            excluidas += 1
        } catch (erro) {
            falhas.push({ item, erro })
        }
    }

    await carregarMovimentacoes()

    const dialogMes = document.getElementById('modalHistoricoMes')

    if (mesModalAberto === chave && dialogMes?.open) {
        dialogMes.close()
    }

    if (falhas.length === 0) {
        mostrarMensagem(
            `Quadrante ${nomeMes(chave)} excluído com ${excluidas} movimentação(ões).`,
            'sucesso'
        )
    } else {
        mostrarMensagem(
            `${excluidas} movimentação(ões) foram excluídas, mas ${falhas.length} não puderam ser excluídas. Tente novamente.`,
            'erro'
        )
    }
}

// Carregar uma biblioteca externa sob demanda para gerar o PDF.
function carregarScript(url, nomeGlobalDisponivel) {
    if (nomeGlobalDisponivel()) {
        return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
        const existente = [...document.scripts].find(
            script => script.src === url
        )

        if (existente) {
            existente.addEventListener('load', resolve, { once: true })

            existente.addEventListener('error', () => {
                reject(
                    new Error('Não foi possível carregar a biblioteca para criar o PDF.')
                )
            }, { once: true })

            return
        }

        const script = document.createElement('script')
        script.src = url
        script.async = true
        script.onload = resolve

        script.onerror = () => {
            reject(
                new Error('Não foi possível carregar a biblioteca para criar o PDF.')
            )
        }

        document.head.appendChild(script)
    })
}

// Gerar e baixar o PDF do mês aberto.
async function baixarPdfMesAtual() {
    if (!mesModalAberto) return

    const chave = mesModalAberto
    const itens = obterGruposPorMes().get(chave) || []

    if (itens.length === 0) {
        mostrarMensagemNoModalMes(
            'Não há movimentações para exportar.',
            'erro'
        )
        return
    }

    const botao = document.getElementById('btnBaixarPdfMes')

    botao.disabled = true
    botao.textContent = 'Gerando PDF...'

    try {
        await carregarScript(
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            () => Boolean(window.jspdf?.jsPDF)
        )

        await carregarScript(
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',
            () => Boolean(window.jspdf?.jsPDF && window.jspdf.jsPDF.API.autoTable)
        )

        const { jsPDF } = window.jspdf

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        })

        const totais = calcularTotais(itens)

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(16)
        pdf.text(`Movimentações - ${nomeMes(chave)}`, 14, 16)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.text(`Total de registros: ${itens.length}`, 14, 23)

        pdf.autoTable({
            startY: 29,
            head: [['Descrição', 'Categoria', 'Data', 'Tipo', 'Valor']],
            body: itens.map(item => [
                item.descricao || '-',
                item.categoriaRef?.nome || item.categoria || '-',
                formatarData(item.data),
                item.tipo === 'receita' ? 'Receita' : 'Despesa',
                `${item.tipo === 'receita' ? '+' : '-'} ${formatarMoeda(item.valor)}`
            ]),
            styles: {
                font: 'helvetica',
                fontSize: 9,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [35, 56, 77]
            },
            margin: {
                left: 14,
                right: 14
            }
        })

        let y = (pdf.lastAutoTable?.finalY || 29) + 10

        if (y > pdf.internal.pageSize.getHeight() - 18) {
            pdf.addPage()
            y = 18
        }

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)

        pdf.text(`Receitas: ${formatarMoeda(totais.receitas)}`, 14, y)
        pdf.text(`Despesas: ${formatarMoeda(totais.despesas)}`, 95, y)
        pdf.text(`Saldo: ${formatarMoeda(totais.saldo)}`, 176, y)

        pdf.save(`movimentacoes-${chave}.pdf`)

        mostrarMensagemNoModalMes('PDF gerado com sucesso.', 'sucesso')
    } catch (erro) {
        mostrarMensagemNoModalMes(
            `${erro.message} Verifique sua conexão com a internet e tente novamente.`,
            'erro'
        )
    } finally {
        botao.disabled = false
        botao.textContent = 'Baixar PDF'
    }
}

// Eventos dos botões.
btnNovaMovimentacao.addEventListener(
    'click',
    abrirModalMovimentacao
)

btnFecharModal.addEventListener(
    'click',
    cancelarFormulario
)

btnCancelar.addEventListener(
    'click',
    cancelarFormulario
)

// Atualizar as categorias quando o tipo mudar.
tipo.addEventListener('change', () => {
    atualizarCategorias()
})

// Manter pesquisa e filtro funcionando nos quadrantes.
pesquisa.addEventListener('input', renderizarQuadrantes)
filtroTipo.addEventListener('change', renderizarQuadrantes)

// Fechar o formulário ao clicar na área externa.
modalMovimentacao.addEventListener('click', evento => {
    if (evento.target === modalMovimentacao) {
        cancelarFormulario()
    }
})

// Tratar o fechamento do pop-up do formulário.
modalMovimentacao.addEventListener('close', () => {
    limparFormulario()

    if (mensagem) {
        mensagem.textContent = ''
        mensagem.className = 'mensagem'
    }

    mesParaReabrir = null
})

// Encerrar a sessão.
if (btnSair) {
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
}

// Seleção do mês exibido nos três indicadores financeiros.
const modalSelecionarMesResumo = document.getElementById('modalSelecionarMesResumo')
const btnAlterarMesResumo = document.getElementById('btnAlterarMesResumo')
const seletorMesResumo = document.getElementById('seletorMesResumo')
const btnAplicarMesResumo = document.getElementById('btnAplicarMesResumo')
const btnFecharSeletorMes = document.getElementById('btnFecharSeletorMes')
const btnCancelarSeletorMes = document.getElementById('btnCancelarSeletorMes')
const mensagemSeletorMes = document.getElementById('mensagemSeletorMes')

if (seletorMesResumo) {
    seletorMesResumo.value = mesResumoSelecionado
}

if (btnAlterarMesResumo && modalSelecionarMesResumo) {
    btnAlterarMesResumo.addEventListener('click', () => {
        seletorMesResumo.value = mesResumoSelecionado

        mensagemSeletorMes.textContent = ''
        mensagemSeletorMes.className = 'mensagem'

        modalSelecionarMesResumo.showModal()
    })
}

function fecharSeletorMesResumo() {
    if (modalSelecionarMesResumo?.open) {
        modalSelecionarMesResumo.close()
    }
}

btnFecharSeletorMes?.addEventListener(
    'click',
    fecharSeletorMesResumo
)

btnCancelarSeletorMes?.addEventListener(
    'click',
    fecharSeletorMesResumo
)

btnAplicarMesResumo?.addEventListener('click', () => {
    const mesEscolhido = seletorMesResumo.value

    if (!/^\d{4}-\d{2}$/.test(mesEscolhido)) {
        mensagemSeletorMes.textContent = 'Selecione um mês válido.'
        mensagemSeletorMes.className = 'mensagem erro'
        return
    }

    mesResumoSelecionado = mesEscolhido

    atualizarResumo(movimentacoes)

    fecharSeletorMesResumo()
})

modalSelecionarMesResumo?.addEventListener('click', evento => {
    if (evento.target === modalSelecionarMesResumo) {
        fecharSeletorMesResumo()
    }
})

// Inicializar a página.
async function iniciarPagina() {
    prepararEstruturaHistorico()

    data.value = dataHoje()

    await carregarCategorias()
    await carregarMovimentacoes()
}

iniciarPagina()
