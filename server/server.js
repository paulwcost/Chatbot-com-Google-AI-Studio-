import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

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

    return res.json({
      response: result.response.text(),
      history: chat.getHistory()
    });
  }

  res.json({
    response: response.response.text(),
    history: chat.getHistory()
  });
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
