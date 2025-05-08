import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Inicializa o cliente da API Gemini com a key do .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Endpoint de chat
app.post('/chat', async (req, res) => {
  const mensagemUsuario = req.body.mensagem;
  const historicoRecebido = req.body.historico || [];

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const chat = model.startChat({
      history: historicoRecebido,
      generationConfig: {
        temperature: 0.7
      },
    });

    const result = await chat.sendMessage(mensagemUsuario);
    const resposta = await result.response.text();

    const novoHistorico = [
      ...historicoRecebido,
      { role: 'user', parts: [{ text: mensagemUsuario }] },
      { role: 'model', parts: [{ text: resposta }] }
    ];

    res.json({ resposta, historico: novoHistorico });

  } catch (error) {
    console.error('Erro ao conversar com a API Gemini:', error);
    res.status(500).json({ erro: 'Desculpe, não consegui processar sua mensagem agora.' });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
