const form = document.getElementById("formCategoria");
const campoId = document.getElementById("categoriaId");
const campoNome = document.getElementById("nome");
const campoTipo = document.getElementById("tipo");
const campoPesquisa = document.getElementById("pesquisa");
const filtroTipo = document.getElementById("filtroTipo");
const lista = document.getElementById("listaCategorias");
const mensagem = document.getElementById("mensagem");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");

let categorias = [];

document.getElementById("dataAtual").textContent =
    new Date().toLocaleDateString("pt-BR", {
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

    if (Number.isNaN(dataFormatada.getTime())) {
        return "-";
    }

    return dataFormatada.toLocaleDateString("pt-BR");
}

function mostrarMensagem(texto, tipo = "") {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
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
        throw new Error(
            dados.mensagem || dados.erro || "Não foi possível realizar a operação."
        );
    }

    return dados;
}

function atualizarResumo() {
    document.getElementById("totalCategorias").textContent =
        categorias.length;

    document.getElementById("totalReceitas").textContent =
        categorias.filter(categoria => categoria.tipo === "receita").length;

    document.getElementById("totalDespesas").textContent =
        categorias.filter(categoria => categoria.tipo === "despesa").length;
}

function renderizarCategorias() {
    const pesquisa = campoPesquisa.value.trim().toLowerCase();
    const tipoSelecionado = filtroTipo.value;

    const filtradas = categorias.filter(categoria => {
        const nomeCorresponde = categoria.nome
            .toLowerCase()
            .includes(pesquisa);

        const tipoCorresponde =
            tipoSelecionado === "todos" ||
            categoria.tipo === tipoSelecionado;

        return nomeCorresponde && tipoCorresponde;
    });

    document.getElementById("quantidadeRegistros").textContent =
        `${filtradas.length} ${filtradas.length === 1 ? "categoria" : "categorias"}`;

    if (filtradas.length === 0) {
        lista.innerHTML = `
            <tr>
                <td colspan="4" class="estado-vazio">
                    Nenhuma categoria encontrada.
                </td>
            </tr>
        `;
        return;
    }

    lista.innerHTML = filtradas.map(categoria => {
        const tipo = categoria.tipo === "receita" ? "Receita" : "Despesa";
        const classeTipo = categoria.tipo === "receita"
            ? "etiqueta-receita"
            : "etiqueta-despesa";

        return `
            <tr>
                <td>${escaparHTML(categoria.nome)}</td>
                <td>
                    <span class="etiqueta-tipo ${classeTipo}">
                        ${tipo}
                    </span>
                </td>
                <td>${formatarData(categoria.criado_em)}</td>
                <td>
                    <div class="acoes-tabela">
                        <button
                            type="button"
                            class="botao-editar"
                            data-acao="editar"
                            data-id="${Number(categoria.id)}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="botao-excluir"
                            data-acao="excluir"
                            data-id="${Number(categoria.id)}"
                        >
                            Excluir
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

async function carregarCategorias() {
    lista.innerHTML = `
        <tr>
            <td colspan="4" class="estado-vazio">
                Carregando categorias...
            </td>
        </tr>
    `;

    try {
        const dados = await requisicao("/categorias");

        categorias = Array.isArray(dados)
            ? dados
            : dados.categorias || [];

        atualizarResumo();
        renderizarCategorias();
    } catch (erro) {
        lista.innerHTML = `
            <tr>
                <td colspan="4" class="estado-vazio">
                    Não foi possível carregar as categorias.
                </td>
            </tr>
        `;

        mostrarMensagem(erro.message, "erro");
    }
}

function limparFormulario() {
    form.reset();
    campoId.value = "";
    campoTipo.value = "receita";

    document.getElementById("tituloFormulario").textContent =
        "Nova categoria";

    btnSalvar.textContent = "Salvar categoria";
    btnCancelar.hidden = true;
    mostrarMensagem("");
}

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

    const url = id
        ? `/categorias/${encodeURIComponent(id)}`
        : "/categorias";

    const metodo = id ? "PUT" : "POST";

    btnSalvar.disabled = true;
    mostrarMensagem("");

    try {
        await requisicao(url, {
            method: metodo,
            body: JSON.stringify(dados)
        });

        mostrarMensagem(
            id
                ? "Categoria atualizada com sucesso."
                : "Categoria cadastrada com sucesso.",
            "sucesso"
        );

        limparFormulario();
        await carregarCategorias();
    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    } finally {
        btnSalvar.disabled = false;
    }
});

btnCancelar.addEventListener("click", limparFormulario);

campoPesquisa.addEventListener("input", renderizarCategorias);
filtroTipo.addEventListener("change", renderizarCategorias);

lista.addEventListener("click", async evento => {
    const botao = evento.target.closest("button[data-acao]");

    if (!botao) return;

    const id = Number(botao.dataset.id);
    const categoria = categorias.find(item => item.id === id);

    if (!categoria) return;

    if (botao.dataset.acao === "editar") {
        campoId.value = categoria.id;
        campoNome.value = categoria.nome;
        campoTipo.value = categoria.tipo;

        document.getElementById("tituloFormulario").textContent =
            "Editar categoria";

        btnSalvar.textContent = "Salvar alterações";
        btnCancelar.hidden = false;

        mostrarMensagem("");
        campoNome.focus();

        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    if (botao.dataset.acao === "excluir") {
        const confirmar = confirm(
            `Deseja realmente excluir a categoria "${categoria.nome}"?`
        );

        if (!confirmar) return;

        botao.disabled = true;

        try {
            await requisicao(`/categorias/${encodeURIComponent(id)}`, {
                method: "DELETE"
            });

            if (campoId.value === String(id)) {
                limparFormulario();
            }

            mostrarMensagem("Categoria excluída com sucesso.", "sucesso");
            await carregarCategorias();
        } catch (erro) {
            mostrarMensagem(erro.message, "erro");
        } finally {
            botao.disabled = false;
        }
    }
});

document.getElementById("btnSair").addEventListener("click", async evento => {
    evento.preventDefault();

    try {
        await requisicao("/auth/logout", {
            method: "POST"
        });

        window.location.href = "/html/login.html";
    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    }
});

carregarCategorias();