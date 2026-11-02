const form = document.getElementById("formCategoria");
const campoId = document.getElementById("categoriaId");
const campoNome = document.getElementById("nome");
const campoTipo = document.getElementById("tipo");
const campoPesquisa = document.getElementById("pesquisa");
const filtroTipo = document.getElementById("filtroTipo");
const listaRecentes = document.getElementById("listaCategorias");
const listaTodas = document.getElementById("listaTodasCategorias");
const mensagem = document.getElementById("mensagem");
const mensagemGlobal = document.getElementById("mensagemGlobal");
const mensagemModalTodas = document.getElementById("mensagemModalTodas");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");
const btnAbrirNovaCategoria = document.getElementById("btnAbrirNovaCategoria");
const btnVerTodas = document.getElementById("btnVerTodas");
const modalFormulario = document.getElementById("modalFormularioCategoria");
const modalTodas = document.getElementById("modalTodasCategorias");
const notificacaoTopo = document.getElementById("notificacaoTopo");
const textoNotificacaoTopo = document.getElementById("textoNotificacaoTopo");

let categorias = [];
let temporizadorNotificacao = null;
let temporizadorOcultarNotificacao = null;

// Exibe uma confirmação temporária centralizada no topo do site.
function mostrarNotificacaoTopo(texto) {
    if (temporizadorNotificacao !== null) {
        window.clearTimeout(temporizadorNotificacao);
    }

    if (temporizadorOcultarNotificacao !== null) {
        window.clearTimeout(temporizadorOcultarNotificacao);
    }

    textoNotificacaoTopo.textContent = texto;
    notificacaoTopo.hidden = false;
    notificacaoTopo.classList.remove("visivel");

    window.requestAnimationFrame(() => {
        notificacaoTopo.classList.add("visivel");
    });

    temporizadorNotificacao = window.setTimeout(() => {
        notificacaoTopo.classList.remove("visivel");

        temporizadorOcultarNotificacao = window.setTimeout(() => {
            if (!notificacaoTopo.classList.contains("visivel")) {
                notificacaoTopo.hidden = true;
            }
        }, 240);
    }, 2600);
}

// Exibe a data atual no cabeçalho.
document.getElementById("dataAtual").textContent = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
});

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function formatarData(data) {
    if (!data) return "-";
    const dataFormatada = new Date(data);
    if (Number.isNaN(dataFormatada.getTime())) return "-";
    return dataFormatada.toLocaleDateString("pt-BR");
}

function mostrarMensagem(texto, tipo = "") {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
}

function mostrarMensagemGlobal(texto, tipo = "") {
    mensagemGlobal.textContent = texto;
    mensagemGlobal.className = `mensagem ${tipo}`;
}

function mostrarMensagemTodas(texto, tipo = "") {
    mensagemModalTodas.textContent = texto;
    mensagemModalTodas.className = `mensagem ${tipo}`;
}

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
            ...opcoes.headers
        }
    });

    if (resposta.status === 401) {
        window.location.href = "/html/login.html";
        throw new Error("Sua sessão expirou. Entre novamente.");
    }

    const texto = await resposta.text();
    let dados = {};
    if (texto) {
        try {
            dados = JSON.parse(texto);
        } catch {
            dados = { mensagem: texto };
        }
    }

    if (!resposta.ok) {
        throw new Error(dados.mensagem || dados.erro || "Não foi possível realizar a operação.");
    }
    return dados;
}

function atualizarResumo() {
    document.getElementById("totalCategorias").textContent = categorias.length;
    document.getElementById("totalReceitas").textContent =
        categorias.filter(categoria => categoria.tipo === "receita").length;
    document.getElementById("totalDespesas").textContent =
        categorias.filter(categoria => categoria.tipo === "despesa").length;
}

// Ordena da mais recente para a mais antiga. O ID serve como critério alternativo.
function obterCategoriasPorRecencia() {
    return [...categorias].sort((a, b) => {
        const dataA = Date.parse(a.criado_em);
        const dataB = Date.parse(b.criado_em);
        const dataAValida = Number.isFinite(dataA);
        const dataBValida = Number.isFinite(dataB);

        if (dataAValida && dataBValida && dataA !== dataB) return dataB - dataA;
        if (dataAValida !== dataBValida) return dataAValida ? -1 : 1;
        return Number(b.id) - Number(a.id);
    });
}

function gerarLinhaCategoria(categoria) {
    const tipo = categoria.tipo === "receita" ? "Receita" : "Despesa";
    const classeTipo = categoria.tipo === "receita" ? "etiqueta-receita" : "etiqueta-despesa";

    return `
        <tr>
            <td>${escaparHTML(categoria.nome)}</td>
            <td><span class="etiqueta-tipo ${classeTipo}">${tipo}</span></td>
            <td>${formatarData(categoria.criado_em)}</td>
            <td>
                <div class="acoes-tabela">
                    <button type="button" class="botao-editar" data-acao="editar" data-id="${Number(categoria.id)}">Editar</button>
                    <button type="button" class="botao-excluir" data-acao="excluir" data-id="${Number(categoria.id)}">Excluir</button>
                </div>
            </td>
        </tr>
    `;
}

function renderizarTabela(container, itens, textoVazio) {
    if (itens.length === 0) {
        container.innerHTML = `<tr><td colspan="4" class="estado-vazio">${textoVazio}</td></tr>`;
        return;
    }
    container.innerHTML = itens.map(gerarLinhaCategoria).join("");
}

function renderizarRecentes() {
    const ordenadas = obterCategoriasPorRecencia();
    const recentes = ordenadas.slice(0, 3);
    renderizarTabela(listaRecentes, recentes, "Nenhuma categoria cadastrada ainda.");

    const quantidade = recentes.length;
    document.getElementById("quantidadeRecentes").textContent =
        `${quantidade} ${quantidade === 1 ? "categoria recente" : "categorias recentes"}`;
    btnVerTodas.hidden = categorias.length <= 3;
}

function renderizarTodasCategorias() {
    const pesquisa = campoPesquisa.value.trim().toLocaleLowerCase("pt-BR");
    const tipoSelecionado = filtroTipo.value;

    const filtradas = obterCategoriasPorRecencia().filter(categoria => {
        const nome = String(categoria.nome ?? "").toLocaleLowerCase("pt-BR");
        const nomeCorresponde = nome.includes(pesquisa);
        const tipoCorresponde = tipoSelecionado === "todos" || categoria.tipo === tipoSelecionado;
        return nomeCorresponde && tipoCorresponde;
    });

    document.getElementById("quantidadeRegistros").textContent =
        `${filtradas.length} de ${categorias.length} ${categorias.length === 1 ? "categoria" : "categorias"}`;
    renderizarTabela(listaTodas, filtradas, "Nenhuma categoria corresponde aos filtros.");
}

function renderizarCategorias() {
    renderizarRecentes();
    renderizarTodasCategorias();
}

async function carregarCategorias() {
    const carregando = '<tr><td colspan="4" class="estado-vazio">Carregando categorias...</td></tr>';
    listaRecentes.innerHTML = carregando;
    listaTodas.innerHTML = carregando;

    try {
        const dados = await requisicao("/categorias");
        categorias = Array.isArray(dados) ? dados : (dados.categorias || []);
        atualizarResumo();
        renderizarCategorias();
        return true;
    } catch (erro) {
        listaRecentes.innerHTML = '<tr><td colspan="4" class="estado-vazio">Não foi possível carregar as categorias.</td></tr>';
        listaTodas.innerHTML = '<tr><td colspan="4" class="estado-vazio">Não foi possível carregar as categorias.</td></tr>';
        if (!modalTodas.hidden) {
            mostrarMensagemTodas(erro.message, "erro");
        } else {
            mostrarMensagemGlobal(erro.message, "erro");
        }
        return false;
    }
}

function abrirModal(modal) {
    modal.hidden = false;
    document.body.classList.add("modal-em-uso");
}

function fecharModal(modal) {
    modal.hidden = true;
    if (modalFormulario.hidden && modalTodas.hidden) {
        document.body.classList.remove("modal-em-uso");
    }
}

function abrirFormulario(categoria = null) {
    form.reset();
    campoId.value = "";
    campoTipo.value = "receita";
    mostrarMensagem("");

    if (categoria) {
        campoId.value = categoria.id;
        campoNome.value = categoria.nome;
        campoTipo.value = categoria.tipo;
        document.getElementById("tituloFormulario").textContent = "Editar categoria";
        btnSalvar.textContent = "Salvar alterações";
    } else {
        document.getElementById("tituloFormulario").textContent = "Nova categoria";
        btnSalvar.textContent = "Salvar categoria";
    }

    abrirModal(modalFormulario);
    campoNome.focus();
}

function limparFormulario() {
    form.reset();
    campoId.value = "";
    campoTipo.value = "receita";
    document.getElementById("tituloFormulario").textContent = "Nova categoria";
    btnSalvar.textContent = "Salvar categoria";
    mostrarMensagem("");
}

btnAbrirNovaCategoria.addEventListener("click", () => {
    mostrarMensagemGlobal("");
    abrirFormulario();
});

btnVerTodas.addEventListener("click", () => {
    mostrarMensagemTodas("");
    renderizarTodasCategorias();
    abrirModal(modalTodas);
    campoPesquisa.focus();
});

btnCancelar.addEventListener("click", () => {
    limparFormulario();
    fecharModal(modalFormulario);
});

form.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = campoId.value;
    const nome = campoNome.value.trim();
    const tipo = campoTipo.value;

    if (!nome) {
        mostrarMensagem("Informe o nome da categoria.", "erro");
        campoNome.focus();
        return;
    }

    const dados = { nome, tipo };
    const url = id ? `/categorias/${encodeURIComponent(id)}` : "/categorias";
    const metodo = id ? "PUT" : "POST";
    const textoSucesso = id
        ? "Categoria Editada com Sucesso"
        : "Categoria Criada com Sucesso";

    btnSalvar.disabled = true;
    mostrarMensagem("");

    try {
        await requisicao(url, { method: metodo, body: JSON.stringify(dados) });
        limparFormulario();
        fecharModal(modalFormulario);
        mostrarNotificacaoTopo(textoSucesso);
        await carregarCategorias();
    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    } finally {
        btnSalvar.disabled = false;
    }
});

campoPesquisa.addEventListener("input", renderizarTodasCategorias);
filtroTipo.addEventListener("change", renderizarTodasCategorias);

// A delegação mantém Editar/Excluir funcionando nas duas listas.
document.addEventListener("click", async evento => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;

    const id = Number(botao.dataset.id);
    const categoria = categorias.find(item => Number(item.id) === id);
    if (!categoria) return;

    if (botao.dataset.acao === "editar") {
        abrirFormulario(categoria);
        return;
    }

    if (botao.dataset.acao === "excluir") {
        const confirmar = window.confirm(`Deseja realmente excluir a categoria "${categoria.nome}"?`);
        if (!confirmar) return;

        botao.disabled = true;
        try {
            await requisicao(`/categorias/${encodeURIComponent(id)}`, { method: "DELETE" });
            if (campoId.value === String(id)) {
                limparFormulario();
                fecharModal(modalFormulario);
            }

            mostrarNotificacaoTopo("Categoria Deletada com Sucesso");
            await carregarCategorias();
        } catch (erro) {
            if (!modalTodas.hidden) {
                mostrarMensagemTodas(erro.message, "erro");
            } else {
                mostrarMensagemGlobal(erro.message, "erro");
            }
        } finally {
            botao.disabled = false;
        }
    }
});

// Fechamento pelos botões, clicando no fundo do modal ou com a tecla Esc.
document.querySelectorAll("[data-fechar-modal]").forEach(botao => {
    botao.addEventListener("click", () => {
        const modal = document.getElementById(botao.dataset.fecharModal);
        if (modal === modalFormulario) limparFormulario();
        fecharModal(modal);
    });
});

[modalFormulario, modalTodas].forEach(modal => {
    modal.addEventListener("click", evento => {
        if (evento.target === modal) {
            if (modal === modalFormulario) limparFormulario();
            fecharModal(modal);
        }
    });
});

document.addEventListener("keydown", evento => {
    if (evento.key !== "Escape") return;
    if (!modalFormulario.hidden) {
        limparFormulario();
        fecharModal(modalFormulario);
    } else if (!modalTodas.hidden) {
        fecharModal(modalTodas);
    }
});

document.getElementById("btnSair").addEventListener("click", async evento => {
    evento.preventDefault();
    try {
        await requisicao("/auth/logout", { method: "POST" });
        window.location.href = "/html/login.html";
    } catch (erro) {
        mostrarMensagemGlobal(erro.message, "erro");
    }
});

carregarCategorias();
