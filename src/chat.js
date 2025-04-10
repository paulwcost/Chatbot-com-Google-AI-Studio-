import React, { useState } from 'react';
import axios from 'axios';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await axios.post('http://localhost:5000/chat', { message: input });
      const botMessage = { sender: 'bot', text: res.data.reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Erro ao responder.' }]);
    }

    setInput('');
  };

  return (
    <div>
      <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '1rem' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
            <p><strong>{msg.sender === 'user' ? 'Você' : 'Bot'}:</strong> {msg.text}</p>
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Digite sua mensagem"
        style={{ width: '80%', marginRight: '1rem' }}
      />
      <button onClick={sendMessage}>Enviar</button>
    </div>
  );
};

export default Chat;
