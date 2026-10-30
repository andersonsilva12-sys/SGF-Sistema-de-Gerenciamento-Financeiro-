const form = document.getElementById("formOrcamento");
const campoId = document.getElementById("orcamentoId");
const campoCategoria = document.getElementById("categoriaId");
const campoLimite = document.getElementById("limite");
const campoMes = document.getElementById("mes");
const campoAno = document.getElementById("ano");
const campoPesquisa = document.getElementById("pesquisa");
const filtroPeriodo = document.getElementById("filtroAnoMes");
const lista = document.getElementById("listaOrcamentos");
const mensagem = document.getElementById("mensagem");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");

let orcamentos = [];
let categorias = [];

const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

document.getElementById("dataAtual").textContent =
    new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

campoMes.value = String(new Date().getMonth() + 1);
campoAno.value = new Date().getFullYear();

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[caractere]);
}

function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency", currency: "BRL"
    });
}

function periodo(item) {
    return `${nomesMeses[item.mes - 1]}/${item.ano}`;
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
        try { dados = JSON.parse(texto); }
        catch { dados = { mensagem: texto }; }
    }

    if (!resposta.ok) {
        throw new Error(dados.mensagem || "Não foi possível realizar a operação.");
    }
    return dados;
}

async function carregarCategorias() {
    categorias = await requisicao("/categorias");
    const despesas = categorias.filter(item => item.tipo === "despesa");

    campoCategoria.innerHTML = '<option value="">Selecione uma categoria</option>' +
        despesas.map(item =>
            `<option value="${Number(item.id)}">${escaparHTML(item.nome)}</option>`
        ).join("");

    if (despesas.length === 0) {
        campoCategoria.innerHTML = '<option value="">Cadastre uma categoria de despesa primeiro</option>';
    }
}

function atualizarResumo() {
    document.getElementById("totalOrcamentos").textContent = orcamentos.length;
    document.getElementById("limiteTotal").textContent =
        moeda(orcamentos.reduce((soma, item) => soma + Number(item.limite), 0));
    document.getElementById("gastoTotal").textContent =
        moeda(orcamentos.reduce((soma, item) => soma + Number(item.gasto), 0));
}

function atualizarFiltroPeriodo() {
    const selecionado = filtroPeriodo.value;
    const periodos = [...new Set(orcamentos.map(item => `${item.ano}-${item.mes}`))]
        .sort((a, b) => b.localeCompare(a));

    filtroPeriodo.innerHTML = '<option value="todos">Todos os períodos</option>' +
        periodos.map(chave => {
            const [ano, mes] = chave.split("-").map(Number);
            return `<option value="${ano}-${mes}">${nomesMeses[mes - 1]}/${ano}</option>`;
        }).join("");

    if (periodos.includes(selecionado)) filtroPeriodo.value = selecionado;
}

function renderizarOrcamentos() {
    const pesquisa = campoPesquisa.value.trim().toLowerCase();
    const periodoSelecionado = filtroPeriodo.value;

    const filtrados = orcamentos.filter(item => {
        const nome = item.categoria?.nome || "";
        const correspondeNome = nome.toLowerCase().includes(pesquisa);
        const correspondePeriodo = periodoSelecionado === "todos" ||
            `${item.ano}-${item.mes}` === periodoSelecionado;
        return correspondeNome && correspondePeriodo;
    });

    document.getElementById("quantidadeRegistros").textContent =
        `${filtrados.length} ${filtrados.length === 1 ? "orçamento" : "orçamentos"}`;

    if (!filtrados.length) {
        lista.innerHTML = '<tr><td colspan="7" class="estado-vazio">Nenhum orçamento encontrado.</td></tr>';
        return;
    }

    lista.innerHTML = filtrados.map(item => {
        const percentualReal = Number(item.limite) > 0
            ? Number(item.gasto) / Number(item.limite) * 100 : 0;
        const classe = percentualReal > 100 ? "barra-excedida" :
            percentualReal >= 80 ? "barra-alerta" : "barra-normal";
        const restante = Number(item.restante);
        return `<tr>
            <td>${escaparHTML(item.categoria?.nome || "Categoria removida")}</td>
            <td>${periodo(item)}</td>
            <td>${moeda(item.limite)}</td>
            <td>${moeda(item.gasto)}</td>
            <td class="${restante < 0 ? "valor-negativo" : ""}">${moeda(restante)}</td>
            <td>
                <div class="progresso-texto">${percentualReal.toFixed(1).replace(".", ",")}%</div>
                <div class="barra-progresso"><span class="${classe}" style="width:${Math.min(percentualReal, 100)}%"></span></div>
            </td>
            <td><div class="acoes-tabela">
                <button type="button" class="botao-editar" data-acao="editar" data-id="${Number(item.id)}">Editar</button>
                <button type="button" class="botao-excluir" data-acao="excluir" data-id="${Number(item.id)}">Excluir</button>
            </div></td>
        </tr>`;
    }).join("");
}

async function carregarOrcamentos() {
    lista.innerHTML = '<tr><td colspan="7" class="estado-vazio">Carregando orçamentos...</td></tr>';
    try {
        orcamentos = await requisicao("/orcamentos");
        atualizarResumo();
        atualizarFiltroPeriodo();
        renderizarOrcamentos();
    } catch (erro) {
        lista.innerHTML = '<tr><td colspan="7" class="estado-vazio">Não foi possível carregar os orçamentos.</td></tr>';
        mostrarMensagem(erro.message, "erro");
    }
}

function limparFormulario() {
    form.reset();
    campoId.value = "";
    campoMes.value = String(new Date().getMonth() + 1);
    campoAno.value = new Date().getFullYear();
    document.getElementById("tituloFormulario").textContent = "Novo orçamento";
    btnSalvar.textContent = "Salvar orçamento";
    btnCancelar.hidden = true;
    mostrarMensagem("");
}

form.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = campoId.value;
    const dados = {
        categoriaId: Number(campoCategoria.value),
        limite: Number(campoLimite.value),
        mes: Number(campoMes.value),
        ano: Number(campoAno.value)
    };

    if (!dados.categoriaId || !Number.isFinite(dados.limite) || dados.limite <= 0) {
        mostrarMensagem("Informe uma categoria e um limite válido.", "erro");
        return;
    }

    btnSalvar.disabled = true;
    mostrarMensagem("");
    try {
        await requisicao(id ? `/orcamentos/${encodeURIComponent(id)}` : "/orcamentos", {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(dados)
        });
        mostrarMensagem(id ? "Orçamento atualizado com sucesso." : "Orçamento cadastrado com sucesso.", "sucesso");
        limparFormulario();
        await carregarOrcamentos();
    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    } finally {
        btnSalvar.disabled = false;
    }
});

btnCancelar.addEventListener("click", limparFormulario);
campoPesquisa.addEventListener("input", renderizarOrcamentos);
filtroPeriodo.addEventListener("change", renderizarOrcamentos);

lista.addEventListener("click", async evento => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;

    const id = Number(botao.dataset.id);
    const item = orcamentos.find(orcamento => orcamento.id === id);
    if (!item) return;

    if (botao.dataset.acao === "editar") {
        campoId.value = item.id;
        campoCategoria.value = item.categoriaId;
        campoLimite.value = item.limite;
        campoMes.value = item.mes;
        campoAno.value = item.ano;
        document.getElementById("tituloFormulario").textContent = "Editar orçamento";
        btnSalvar.textContent = "Salvar alterações";
        btnCancelar.hidden = false;
        mostrarMensagem("");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    if (botao.dataset.acao === "excluir" &&
        confirm(`Deseja realmente excluir o orçamento de ${item.categoria?.nome || "esta categoria"} (${periodo(item)})?`)) {
        botao.disabled = true;
        try {
            await requisicao(`/orcamentos/${id}`, { method: "DELETE" });
            if (campoId.value === String(id)) limparFormulario();
            mostrarMensagem("Orçamento excluído com sucesso.", "sucesso");
            await carregarOrcamentos();
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
        await requisicao("/auth/logout", { method: "POST" });
        window.location.href = "/html/login.html";
    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    }
});

(async function iniciar() {
    try {
        await carregarCategorias();
        await carregarOrcamentos();
    } catch (erro) {
        mostrarMensagem(erro.message, "erro");
    }
})();
