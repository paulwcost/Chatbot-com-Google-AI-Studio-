let chatHistory = [];

const backendUrl = "https://chatbot-back-end-ja4v.onrender.com";

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

  } catch (erro) {
    addMensagem("Erro", "Oops! Algo deu errado. Tente novamente.");
    console.error(erro);
  } finally {
    removeBotDigitando();
    input.value = "";
  }
});
