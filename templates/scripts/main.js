const formMovimentacao = document.getElementById("formMovimentacao");
const listaMovimentacoes = document.getElementById("listaMovimentacoes");
const mensagem = document.getElementById("mensagem");
const pesquisa = document.getElementById("pesquisa");
const filtroTipo = document.getElementById("filtroTipo");

let movimentacoes = JSON.parse(localStorage.getItem("movimentacoesSGF")) || [];

document.getElementById("dataAtual").textContent =
    new Date().toLocaleDateString("pt-BR");

function formatarValor(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function salvarMovimentacoes() {
    localStorage.setItem("movimentacoesSGF", JSON.stringify(movimentacoes));
}

function atualizarResumo() {
    const receitas = movimentacoes
        .filter(item => item.tipo === "receita")
        .reduce((total, item) => total + item.valor, 0);

    const despesas = movimentacoes
        .filter(item => item.tipo === "despesa")
        .reduce((total, item) => total + item.valor, 0);

    document.getElementById("receitas").textContent = formatarValor(receitas);
    document.getElementById("despesas").textContent = formatarValor(despesas);
    document.getElementById("saldo").textContent = formatarValor(receitas - despesas);
}

function renderizarMovimentacoes() {
    const termo = pesquisa.value.toLowerCase();
    const tipoSelecionado = filtroTipo.value;

    const filtradas = movimentacoes.filter(item => {
        const combinaDescricao = item.descricao.toLowerCase().includes(termo);
        const combinaTipo = tipoSelecionado === "todos" || item.tipo === tipoSelecionado;

        return combinaDescricao && combinaTipo;
    });

    listaMovimentacoes.innerHTML = "";

    if (filtradas.length === 0) {
        listaMovimentacoes.innerHTML =
            '<p class="vazio">Nenhuma movimentação encontrada.</p>';
        return;
    }

    filtradas.slice().reverse().forEach(item => {
        const elemento = document.createElement("div");
        elemento.className = "movimentacao";

        const informacoes = document.createElement("div");
        const titulo = document.createElement("h3");
        const detalhes = document.createElement("p");

        titulo.textContent = item.descricao;
        detalhes.textContent = `${item.categoria} • ${item.data}`;

        informacoes.append(titulo, detalhes);

        const valores = document.createElement("div");
        valores.className = "valor-movimentacao";

        const valor = document.createElement("strong");
        valor.className = item.tipo;
        valor.textContent =
            `${item.tipo === "receita" ? "+" : "-"} ${formatarValor(item.valor)}`;

        const botaoExcluir = document.createElement("button");
        botaoExcluir.type = "button";
        botaoExcluir.textContent = "Excluir";
        botaoExcluir.addEventListener("click", () => excluirMovimentacao(item.id));

        valores.append(valor, botaoExcluir);
        elemento.append(informacoes, valores);
        listaMovimentacoes.appendChild(elemento);
    });
}

function excluirMovimentacao(id) {
    movimentacoes = movimentacoes.filter(item => item.id !== id);
    salvarMovimentacoes();
    atualizarResumo();
    renderizarMovimentacoes();
}

formMovimentacao.addEventListener("submit", event => {
    event.preventDefault();

    const descricao = document.getElementById("descricao").value.trim();
    const valor = Number(document.getElementById("valor").value);
    const tipo = document.getElementById("tipo").value;
    const categoria = document.getElementById("categoria").value;

    if (!descricao || !Number.isFinite(valor) || valor <= 0) {
        mensagem.textContent = "Informe uma descrição e um valor válido.";
        mensagem.className = "erro";
        return;
    }

    const movimentacao = {
        id: Date.now(),
        descricao,
        valor,
        tipo,
        categoria,
        data: new Date().toLocaleDateString("pt-BR")
    };

    movimentacoes.push(movimentacao);
    salvarMovimentacoes();
    atualizarResumo();
    renderizarMovimentacoes();

    formMovimentacao.reset();

    mensagem.textContent = "Movimentação adicionada com sucesso!";
    mensagem.className = "sucesso";
});

pesquisa.addEventListener("input", renderizarMovimentacoes);
filtroTipo.addEventListener("change", renderizarMovimentacoes);

document.getElementById("btnLimpar").addEventListener("click", () => {
    if (movimentacoes.length === 0) {
        return;
    }

    if (confirm("Deseja excluir todas as movimentações salvas neste navegador?")) {
        movimentacoes = [];
        salvarMovimentacoes();
        atualizarResumo();
        renderizarMovimentacoes();
        mensagem.textContent = "";
        mensagem.className = "";
    }
});

document.getElementById("btnSair").addEventListener("click", async () => {
    const sair = confirm("Deseja sair do sistema?");

    if (sair) {
        window.location.href = "/html/login.html";
    }
});

atualizarResumo();
renderizarMovimentacoes();