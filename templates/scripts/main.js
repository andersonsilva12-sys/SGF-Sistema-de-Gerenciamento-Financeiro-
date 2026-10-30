
const dataAtual = document.getElementById("dataAtual");

dataAtual.textContent = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
});

document.getElementById("saldo").textContent = "R$ 0,00";
document.getElementById("receitas").textContent = "R$ 0,00";
document.getElementById("despesas").textContent = "R$ 0,00";
