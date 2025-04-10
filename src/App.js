import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './App.css'; // importe o CSS aqui

const genAI = new GoogleGenerativeAI("AIzaSyCozJFIozTZH0yufE159GsOnHW-RBZstz0");

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      setResponse(text);
    } catch (error) {
      setResponse("Ocorreu um erro. Verifique sua chave de API e conexão.");
      console.error(error);
    }
  };

  return (
    <div className="container">
      <h1>Chatbot com Google Generative AI</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Digite sua pergunta aqui..."
          rows="4"
        />
        <button type="submit">Enviar</button>
      </form>
      {response && (
        <div className="resposta">
          <h2>Resposta:</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

export default App;
