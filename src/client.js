let chatHistory = [];

sendButton.addEventListener("click", async () => {
  const mensagem = input.value;
  addMensagem("Você", mensagem);

  showBotDigitando(); // Mostrar "digitando..."

  try {
    const resposta = await fetch("/chat", {
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
