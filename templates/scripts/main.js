
const dataAtual = document.getElementById("dataAtual");

dataAtual.textContent = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
});

function formatarMoeda(numero) {
    return Number(numero).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

async function carregarResumo() {
    const saldoElemento = document.getElementById("saldo");
    const receitasElemento = document.getElementById("receitas");
    const despesasElemento = document.getElementById("despesas");

    try {
        const resposta = await fetch("/movimentacoes", {
            credentials: "same-origin"
        });

        if (resposta.status === 401) {
            window.location.href = "/html/login.html";
            return;
        }

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar as movimentações.");
        }

        const movimentacoes = await resposta.json();

        const agora = new Date();

        const mesAtual = agora.getMonth();
        const anoAtual = agora.getFullYear();

        // Filtrar movimentações do mês atual
        const movimentacoesDoMes = movimentacoes.filter(item => {
            const dataMovimentacao = new Date(item.data);

            return (
                dataMovimentacao.getUTCMonth() === mesAtual &&
                dataMovimentacao.getUTCFullYear() === anoAtual
            );
        });

        // Receitas do mês
        const receitas = movimentacoesDoMes
            .filter(item => item.tipo === "receita")
            .reduce((soma, item) => soma + Number(item.valor), 0);

        // Despesas do mês
        const despesas = movimentacoesDoMes
            .filter(item => item.tipo === "despesa")
            .reduce((soma, item) => soma + Number(item.valor), 0);

        // Saldo acumulado de todas as movimentações
        const receitasTotais = movimentacoes
            .filter(item => item.tipo === "receita")
            .reduce((soma, item) => soma + Number(item.valor), 0);

        const despesasTotais = movimentacoes
            .filter(item => item.tipo === "despesa")
            .reduce((soma, item) => soma + Number(item.valor), 0);

        const saldo = receitasTotais - despesasTotais;

        // Atualizar cartões da página inicial
        receitasElemento.textContent = formatarMoeda(receitas);
        despesasElemento.textContent = formatarMoeda(despesas);
        saldoElemento.textContent = formatarMoeda(saldo);

    } catch (erro) {
        console.error("Erro ao carregar resumo financeiro:", erro);

        saldoElemento.textContent = "Erro ao carregar";
        receitasElemento.textContent = "Erro ao carregar";
        despesasElemento.textContent = "Erro ao carregar";
    }
}

carregarResumo();
