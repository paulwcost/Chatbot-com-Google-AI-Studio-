import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { MongoClient, ServerApiVersion } from 'mongodb';

dotenv.config();
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Ferramentas que o Gemini pode chamar
const tools = [
  {
    functionDeclarations: [
      {
        name: "getCurrentTime",
        description: "Retorna o horário atual.",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "getWeather",
        description: "Retorna o clima de uma cidade.",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "Cidade e país (ex: Curitiba, BR)"
            }
          },
          required: ["location"]
        }
      }
    ]
  }
];

// Implementação real das funções
function getCurrentTime() {
  return { currentTime: new Date().toLocaleString() };
}

async function getWeather(args) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const location = args.location;

  if (!location) {
    return { error: "Parâmetro 'location' é obrigatório." };
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&lang=pt_br`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (!data || !data.weather || !data.main) {
      return { error: "Dados incompletos retornados da API do clima." };
    }

    return {
      location: data.name,
      temperature: data.main.temp,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind ? data.wind.speed : null,
    };

  } catch (error) {
    console.error("Erro ao buscar clima:", error.response?.data || error.message);
    return { error: "Erro ao buscar clima." };
  }
}

const availableFunctions = {
  getCurrentTime,
  getWeather
};

// Rota de chat
app.post('/chat', async (req, res) => {
  const { userMessage, history = [] } = req.body;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: tools
  });

  const chat = model.startChat({ history });

  const response = await chat.sendMessage(userMessage);

  let botReply = response.response.text();

  if (response.functionCalls().length > 0) {
    const functionCall = response.functionCalls()[0];
    const func = availableFunctions[functionCall.name];

    // Parse args se for string JSON
    let args = functionCall.args;
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (e) {
        console.error('Erro ao parsear args:', e);
        args = {};
      }
    }

    const functionResult = await func(args);

    const result = await chat.sendMessage([
      {
        functionResponse: {
          name: functionCall.name,
          response: functionResult
        }
      }
    ]);

    botReply = result.response.text();
  }

  // Salvar log da interação no MongoDB
  try {
    if (!db) await connectDB();
    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress || null;
    const log = {
      ipAddress: ip,
      pergunta: userMessage,
      resposta: botReply, // Sempre salva o texto final da resposta
      dataHora: new Date(),
      acao: 'pergunta_resposta_chatbot'
    };
    await db.collection('chatLogs').insertOne(log);
    console.log('[Servidor] Log de chat salvo:', log);
  } catch (err) {
    console.error('[Servidor] Erro ao salvar log de chat:', err);
  }

  res.json({
    response: botReply,
    history: chat.getHistory()
  });
});

app.get('/api/user-info', async (req, res) => {
    try {
        // Tenta obter o IP do header x-forwarded-for (comum em proxies como o do Render)
        // ou diretamente do req.socket.remoteAddress
        const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress;
        
        if (!ip) {
            return res.status(400).json({ error: "Não foi possível determinar o endereço IP." });
        }

        // Chamada para ip-api.com (não precisa de chave para o básico)
        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,city,query`);
        
        if (geoResponse.data.status === 'success') {
            res.json({
                ip: geoResponse.data.query, // O IP que foi consultado
                city: geoResponse.data.city,
                country: geoResponse.data.country,
            });
        } else {
            res.status(500).json({ error: geoResponse.data.message || "Erro ao obter geolocalização." });
        }

    } catch (error) {
        console.error("[Servidor] Erro em /api/user-info:", error.message);
        res.status(500).json({ error: "Erro interno ao processar informações do usuário." });
    }
});

const mongoUri = "mongodb+srv://user_log_acess:Log4c3ss2025@cluster0.nbt3sks.mongodb.net/IIW2023A_logs?retryWrites=true&w=majority&appName=Cluster0";
let db; // Variável para guardar a referência do banco

// Função para conectar ao MongoDB
async function connectDB() {
    if (db) {
      console.log("Já conectado ao MongoDB Atlas.");
      return db; // Se já conectado, retorna a instância
    }
    if (!mongoUri) {
        console.error("MONGO_URI não definida no .env! :"+ process.env.MONGO_URI);
        console.error("Certifique-se de definir a variável de ambiente MONGO_URI com a URI do MongoDB Atlas.");
        process.exit(1); // Encerra se não tiver URI
    }
    const client = new MongoClient(mongoUri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    try {
        await client.connect();
        db = client.db("IIW2023A_logs"); // Banco correto
        console.log("Conectado ao MongoDB Atlas!");
        return db;
    } catch (err) {
        console.error("Falha ao conectar ao MongoDB:", err);
        process.exit(1);
    }
}

// Chamar a função para conectar quando o servidor inicia
connectDB();

app.post('/api/log-connection', async (req, res) => {
    if (!db) { // Garante que o DB está conectado
        await connectDB();
        if (!db) return res.status(500).json({ error: "Servidor não conectado ao banco de dados." });
    }

    try {
        const { ip, acao } = req.body;
        if (!ip || !acao) {
            return res.status(400).json({ error: "Dados de log incompletos (IP e ação são obrigatórios)." });
        }
        const agora = new Date();
        const dataFormatada = agora.toISOString().split('T')[0]; // YYYY-MM-DD
        const horaFormatada = agora.toTimeString().split(' ')[0]; // HH:MM:SS
        const logEntry = {
            col_data: dataFormatada,
            col_hora: horaFormatada,
            col_IP: ip,
            col_nome_bot: "chatbio",
            col_acao: acao
        };
        const collection = db.collection("td_cl_user_log_acess");
        const result = await collection.insertOne(logEntry);
        console.log('[Servidor] Log oficial salvo:', logEntry);
        res.status(201).json({ message: "Log de acesso salvo com sucesso!", logId: result.insertedId });
    } catch (error) {
        console.error("[Servidor] Erro em /api/log-connection:", error.message);
        res.status(500).json({ error: "Erro interno ao salvar log de conexão." });
    }
});

let dadosRankingVitrine = [];

app.post('/api/ranking/registrar-acesso-bot', (req, res) => {
    const { botId, nomeBot, timestampAcesso, usuarioId } = req.body;

    if (!botId || !nomeBot) {
        return res.status(400).json({ error: "ID e Nome do Bot são obrigatórios para o ranking." });
    }

    const acesso = {
        botId,
        nomeBot,
        usuarioId: usuarioId || 'anonimo',
        acessoEm: timestampAcesso ? new Date(timestampAcesso) : new Date(),
        contagem: 1
    };

    const botExistente = dadosRankingVitrine.find(b => b.botId === botId);
    if (botExistente) {
        botExistente.contagem += 1;
        botExistente.ultimoAcesso = acesso.acessoEm;
    } else {
        dadosRankingVitrine.push({
            botId: botId,
            nomeBot: nomeBot,
            contagem: 1,
            ultimoAcesso: acesso.acessoEm
        });
    }
    console.log('[Servidor] Dados de ranking atualizados:', dadosRankingVitrine);
    res.status(201).json({ message: `Acesso ao bot ${nomeBot} registrado para ranking.` });
});

app.get('/api/ranking/visualizar', (req, res) => {
    const rankingOrdenado = [...dadosRankingVitrine].sort((a, b) => b.contagem - a.contagem);
    res.json(rankingOrdenado);
});

// Inicia servidor
app.listen(port, () => {
  console.log(`Servidor rodando! Use o endpoint do Render: https://chatbot-back-end-ja4v.onrender.com`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("ALERTA: GEMINI_API_KEY não está definida no arquivo .env! O chatbot não funcionará.");
  }
  if (!process.env.OPENWEATHER_API_KEY) {
    console.warn("ALERTA: OPENWEATHER_API_KEY não está definida no arquivo .env! A função getWeather não funcionará.");
  }
  if (!process.env.LASTFM_API_KEY) {
    console.warn("ALERTA: LASTFM_API_KEY não está definida no arquivo .env! A função searchSong não funcionará.");
  }
});
