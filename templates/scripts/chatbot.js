
'use strict';

const contextosChatbot = {
    dashboard: {
        titulo: 'Assistente financeiro',
        mensagem: 'Olá! Sou o assistente financeiro do SGF. Posso ajudar você a entender suas finanças, analisar seus gastos e encontrar oportunidades para economizar.'
    },

    transacoes: {
        titulo: 'Assistente de transações',
        mensagem: 'Olá! Estamos na área de movimentações. Posso ajudar você a analisar suas receitas, despesas e movimentações financeiras.'
    },

    categorias: {
        titulo: 'Assistente de categorias',
        mensagem: 'Olá! Posso ajudar você a entender a distribuição dos seus gastos e organizar melhor suas categorias financeiras.'
    },

    contas: {
        titulo: 'Assistente de contas',
        mensagem: 'Olá! Posso ajudar você a acompanhar seus saldos e entender melhor suas contas financeiras.'
    },

    orcamentos: {
        titulo: 'Assistente de orçamentos',
        mensagem: 'Olá! Posso ajudar você a acompanhar seus orçamentos, identificar limites próximos de serem atingidos e planejar seus gastos.'
    },

    metas: {
        titulo: 'Assistente de metas',
        mensagem: 'Olá! Posso ajudar você a acompanhar suas metas financeiras e pensar em estratégias para alcançar seus objetivos.'
    }
};

const paginaAtual = document.body.dataset.page || 'dashboard';
const contextoAtual = contextosChatbot[paginaAtual] || contextosChatbot.dashboard;
const containerChatbot = document.getElementById('chatbot-container');

// Configuração do Markdown
if (window.marked) {
    marked.setOptions({
        gfm: true,
        breaks: true
    });
}

if (containerChatbot) {

    containerChatbot.innerHTML = `
        <button
            type="button"
            class="chatbot-botao"
            id="chatbotAbrir"
            aria-label="Abrir assistente financeiro"
            aria-expanded="false"
        >
            <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>
            </svg>
        </button>

        <section
            class="chatbot-popup"
            id="chatbotPopup"
            aria-label="Assistente financeiro"
            aria-hidden="true"
        >
            <header class="chatbot-cabecalho">
                <div class="chatbot-avatar">✦</div>

                <div class="chatbot-identificacao">
                    <h3 id="chatbotTitulo"></h3>
                    <span>Assistente do SGF</span>
                </div>

                <button
                    type="button"
                    class="chatbot-fechar"
                    id="chatbotFechar"
                    aria-label="Fechar conversa"
                >
                    ×
                </button>
            </header>

            <div
                class="chatbot-mensagens"
                id="chatbotMensagens"
                aria-live="polite"
            ></div>

            <form class="chatbot-entrada" id="chatbotFormulario">
                <input
                    type="text"
                    id="chatbotInput"
                    placeholder="Digite sua mensagem..."
                    autocomplete="off"
                    aria-label="Digite sua mensagem"
                >

                <button type="submit" id="chatbotEnviar" aria-label="Enviar mensagem">
                    ➤
                </button>
            </form>
        </section>
    `;

    const botaoAbrir = document.getElementById('chatbotAbrir');
    const botaoFechar = document.getElementById('chatbotFechar');
    const popup = document.getElementById('chatbotPopup');
    const titulo = document.getElementById('chatbotTitulo');
    const mensagens = document.getElementById('chatbotMensagens');
    const formulario = document.getElementById('chatbotFormulario');
    const input = document.getElementById('chatbotInput');
    const botaoEnviar = document.getElementById('chatbotEnviar');

    titulo.textContent = contextoAtual.titulo;

    let primeiraAbertura = true;
    let aguardandoResposta = false;

    // Converte Markdown em HTML seguro
    function formatarMarkdown(texto) {
        if (!window.marked || !window.DOMPurify) {
            return null;
        }

        const html = window.marked.parse(String(texto));

        return window.DOMPurify.sanitize(html);
    }

    function abrirChatbot() {
        popup.classList.add('aberto');

        popup.setAttribute('aria-hidden', 'false');
        botaoAbrir.setAttribute('aria-expanded', 'true');

        if (primeiraAbertura) {
            adicionarMensagem(contextoAtual.mensagem, 'bot');
            primeiraAbertura = false;
        }

        input.focus();
    }

    function fecharChatbot() {
        popup.classList.remove('aberto');

        popup.setAttribute('aria-hidden', 'true');
        botaoAbrir.setAttribute('aria-expanded', 'false');
    }

    function adicionarMensagem(texto, tipo) {
        const mensagem = document.createElement('div');

        mensagem.classList.add('chatbot-mensagem', tipo);

        if (tipo === 'bot') {
            const htmlSeguro = formatarMarkdown(texto);

            if (htmlSeguro !== null) {
                mensagem.innerHTML = htmlSeguro;
            } else {
                mensagem.textContent = texto;
            }
        } else {
            // Mensagens do usuário continuam como texto puro
            mensagem.textContent = texto;
        }

        mensagens.appendChild(mensagem);
        mensagens.scrollTop = mensagens.scrollHeight;
    }

    async function enviarMensagem(mensagem) {
        if (aguardandoResposta || !mensagem.trim()) {
            return;
        }

        adicionarMensagem(mensagem, 'usuario');

        input.value = '';
        input.disabled = true;
        botaoEnviar.disabled = true;
        aguardandoResposta = true;

        const digitando = document.createElement('div');

        digitando.classList.add('chatbot-digitando');
        digitando.textContent = 'Assistente está digitando...';

        mensagens.appendChild(digitando);
        mensagens.scrollTop = mensagens.scrollHeight;

        try {
            const respostaAPI = await fetch('/chatbot/mensagem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mensagem,
                    pagina: paginaAtual
                })
            });

            const dados = await respostaAPI.json();

            if (!respostaAPI.ok) {
                throw new Error(
                    dados.mensagem || 'Não foi possível obter uma resposta.'
                );
            }

            digitando.remove();
            adicionarMensagem(dados.resposta, 'bot');

        } catch (erro) {
            digitando.remove();

            adicionarMensagem(
                erro.message || 'Não foi possível processar sua mensagem. Tente novamente.',
                'bot'
            );

            console.error('Erro no chatbot:', erro);

        } finally {
            aguardandoResposta = false;
            input.disabled = false;
            botaoEnviar.disabled = false;
            input.focus();
        }
    }

    botaoAbrir.addEventListener('click', () => {
        if (popup.classList.contains('aberto')) {
            fecharChatbot();
        } else {
            abrirChatbot();
        }
    });

    botaoFechar.addEventListener('click', fecharChatbot);

    formulario.addEventListener('submit', (evento) => {
        evento.preventDefault();

        const mensagem = input.value.trim();
        enviarMensagem(mensagem);
    });

    input.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') {
            fecharChatbot();
        }
    });
}
