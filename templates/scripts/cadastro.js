
const formCadastro = document.getElementById("formCadastro");
const mensagem = document.getElementById("mensagem");

formCadastro.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    mensagem.textContent = "";
    mensagem.className = "";

    if (senha !== confirmarSenha) {
        mensagem.textContent = "As senhas não coincidem.";
        mensagem.className = "erro";
        return;
    }

    if (senha.length < 6) {
        mensagem.textContent = "A senha deve ter pelo menos 6 caracteres.";
        mensagem.className = "erro";
        return;
    }

    try {
        const resposta = await fetch("/usuarios", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome,
                email,
                senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagem.textContent = dados.mensagem || dados.erro || "Não foi possível criar a conta.";
            mensagem.className = "erro";
            return;
        }

        mensagem.textContent = "Conta criada com sucesso! Redirecionando para o login...";
        mensagem.className = "sucesso";

        formCadastro.reset();

        setTimeout(() => {
            window.location.href = "/html/login.html";
        }, 1500);

    } catch (erro) {
        console.error("Erro ao cadastrar:", erro);
        mensagem.textContent = "Não foi possível conectar ao servidor.";
        mensagem.className = "erro";
    }
});
