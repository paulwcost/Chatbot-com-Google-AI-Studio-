let currentSessionId = `sessao_${Date.now()}_${Math.random().toString(36).substring(7)}`;
let chatStartTime = new Date();
const backendUrl = "https://chatbot-back-end-ja4v.onrender.com";

async function salvarHistoricoSessao(sessionId, botId, startTime, endTime, messages) {
    try {
        const payload = {
            sessionId,
            botId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            messages
        };
        const response = await fetch(`${backendUrl}/api/chat/salvar-historico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Falha ao salvar histórico:", errorData.error || response.statusText);
        } else {
            const result = await response.json();
            console.log("Histórico de sessão enviado:", result.message);
        }
    } catch (error) {
        console.error("Erro ao enviar histórico de sessão:", error);
    }
}

let chatHistory = [];

// Gera um sessionId simples ao carregar a página
const sessionId = `sessao_${Date.now()}`;

async function registrarConexaoUsuario() {
    try {
        // 1. Obter informações do usuário (IP) do nosso backend
        const userInfoResponse = await fetch(`${backendUrl}/api/user-info`);
        if (!userInfoResponse.ok) {
            console.error("Falha ao obter user-info:", await userInfoResponse.text());
            return;
        }
        const userInfo = await userInfoResponse.json();

        if (userInfo.error) {
            console.error("Erro do servidor ao obter user-info:", userInfo.error);
            return;
        }
        
        // 2. Enviar log para o backend
        const logData = {
            ip: userInfo.ip,
            acao: "acesso_inicial_chatbot"
        };

        const logResponse = await fetch(`${backendUrl}/api/log-connection`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logData),
        });

        if (!logResponse.ok) {
            console.error("Falha ao enviar log de conexão:", await logResponse.text());
        } else {
            const result = await logResponse.json();
            console.log("Log de conexão enviado:", result.message);
        }

    } catch (error) {
        console.error("Erro ao registrar conexão do usuário:", error);
    }
}

window.addEventListener('load', registrarConexaoUsuario);

sendButton.addEventListener("click", async () => {
  const mensagem = input.value;
  addMensagem("Você", mensagem);

  showBotDigitando(); // Mostrar "digitando..."

  try {
    const resposta = await fetch("https://chatbot-back-end-ja4v.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage: mensagem, history: chatHistory })
    });

    if (!resposta.ok) {
      throw new Error("Erro HTTP: " + resposta.status);
    }

    const data = await resposta.json();
    chatHistory = data.history;
    addMensagem("Bot", data.response);
    await salvarHistoricoSessao(currentSessionId, "chatbotPrincipalIFCODE", chatStartTime, new Date(), chatHistory);

  } catch (erro) {
    addMensagem("Erro", "Oops! Algo deu errado. Tente novamente.");
    console.error(erro);
  } finally {
    removeBotDigitando();
    input.value = "";
  }
});

// Função para enviar o histórico completo ao backend
async function salvarHistoricoChat() {
    try {
        const data = {
            sessionId: sessionId,
            botId: "chatbio",
            startTime: window.__chatStartTime || new Date().toISOString(),
            endTime: new Date().toISOString(),
            messages: chatHistory,
        };
        const response = await fetch(`${backendUrl}/api/chat/salvar-historico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            console.error("Falha ao salvar histórico do chat:", await response.text());
        } else {
            const result = await response.json();
            console.log("Histórico de chat salvo:", result.sessionId);
        }
    } catch (error) {
        console.error("Erro ao salvar histórico do chat:", error);
    }
}

addMensagem = (autor, mensagem) => {
    // ...existing code...
    // Após adicionar mensagem do bot, se for resposta do bot, salva histórico
    if (autor === "Bot") {
        salvarHistoricoChat();
    }
};
