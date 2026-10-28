
const formLogin = document.getElementById("formLogin");
const mensagem = document.getElementById("mensagem");

formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    mensagem.textContent = "Verificando login...";
    mensagem.className = "";

    try {
        const resposta = await fetch("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, senha })
        });

        const dados = await resposta.json();

        console.log("Status da resposta:", resposta.status);
        console.log("Dados recebidos:", dados);

        if (!resposta.ok) {
            mensagem.textContent =
                dados.mensagem || dados.erro || "E-mail ou senha inválidos.";
            mensagem.className = "erro";
            return;
        }

        mensagem.textContent = "Login realizado com sucesso!";
        mensagem.className = "sucesso";

        setTimeout(() => {
            window.location.href = "/html/index.html";
        }, 1000);

    } catch (erro) {
        console.error("Erro ao fazer login:", erro);

        mensagem.textContent =
            "Falha na comunicação com o servidor. Confira o terminal e o Console.";
        mensagem.className = "erro";
    }
});
