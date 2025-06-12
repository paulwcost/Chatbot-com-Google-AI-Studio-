import React, { useState, useRef, useEffect } from 'react';

const BiologyChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatBoxRef = useRef(null);

  // Formatação da data para separadores
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  // Função para obter apenas a data atual formatada
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = formatDate(now);
    return { date };
  };

  // Grupo as mensagens por data para mostrar separadores
  const groupMessagesByDate = () => {
    const groups = [];
    let currentDate = null;
    let currentMessages = [];

    messages.forEach((msg) => {
      const messageDate = msg.timestamp ? new Date(msg.timestamp) : new Date();
      const dateStr = formatDate(messageDate);

      if (dateStr !== currentDate) {
        if (currentMessages.length > 0) {
          groups.push({
            date: currentDate,
            messages: currentMessages
          });
        }
        currentDate = dateStr;
        currentMessages = [msg];
      } else {
        currentMessages.push(msg);
      }
    });

    if (currentMessages.length > 0) {
      groups.push({
        date: currentDate,
        messages: currentMessages
      });
    }

    return groups;
  };

  // Formatação de hora para mensagens
  const formatTime = (date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Função para formatar texto com marcações de negrito
  const formatBoldText = (text) => {
    if (!text) return '';
    
    // Substitui padrões **texto** por elementos <strong>texto</strong>
    const formattedText = text.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.substring(2, part.length - 2);
        return <strong key={index}>{boldText}</strong>;
      }
      return part;
    });
    
    return formattedText;
  };

  const API_KEY = 'AIzaSyCozJFIozTZH0yufE159GsOnHW-RBZstz0';

  // Verifica se a pergunta é sobre data atual
  const isDateTimeQuestion = (input) => {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('que dia é hoje') || 
           lowerInput.includes('data atual') || 
           lowerInput.includes('qual é a data') ||
           lowerInput.includes('qual a data') ||
           lowerInput.includes('data de hoje') ||
           lowerInput.includes('data do dia');
  };

  // Função para gerar resposta apenas sobre a data
  const getDateTimeResponse = () => {
    const { date } = getCurrentDateTime();
    return `Hoje é ${date}.`;
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    // Atualiza com a mensagem do usuário
    const currentTime = new Date();
    const newUserMessage = {
      sender: 'user',
      text: userInput,
      timestamp: currentTime.toISOString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);
    
    // Pequeno atraso antes de mostrar o indicador de digitação
    setTimeout(() => setShowTyping(true), 500);

    try {
      // Verifica se é uma pergunta sobre data/hora
      if (isDateTimeQuestion(userInput)) {
        // Se for sobre data/hora, responde localmente sem chamar a API
        setTimeout(() => {
          setShowTyping(false);
          setMessages(prev => [
            ...prev, 
            { 
              sender: 'bot', 
              text: getDateTimeResponse(), 
              timestamp: new Date().toISOString() 
            }
          ]);
          setIsLoading(false);
        }, 1000);
        return;
      }
      
      // Se não for sobre data/hora, continua com a chamada da API
      const currentDate = formatDate(new Date());
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Você é um assistente virtual com especialidade em biologia, 
                    mas também pode responder perguntas de outras áreas do conhecimento. 
                    Sempre que possível, mantenha explicações claras e educativas. 
                    A data de hoje é ${currentDate}. 
                    Responda à pergunta a seguir: ${userInput}`

                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(`API respondeu com status ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      // Processando a resposta do Gemini
      const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                       'Não consegui processar essa informação biológica. Pode reformular?';

      // Atraso artificial para simular o tempo de resposta e criar uma experiência mais natural
      setTimeout(() => {
        setShowTyping(false);
        // Adiciona a resposta do bot com timestamp
        setMessages(prev => [
          ...prev, 
          { 
            sender: 'bot', 
            text: botReply, 
            timestamp: new Date().toISOString() 
          }
        ]);
        setIsLoading(false);
      }, 1000);
      
    } catch (err) {
      console.error('Erro na API:', err);
      setShowTyping(false);
      setMessages(prev => [
        ...prev, 
        { 
          sender: 'bot', 
          text: `Erro ao acessar o núcleo de dados biológicos: ${err.message}. Verifique o console para mais detalhes.`,
          timestamp: new Date().toISOString()
        }
      ]);
      setIsLoading(false);
    }
  };

  // Permite enviar mensagem ao pressionar Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  // Autoscroll para a mensagem mais recente
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showTyping]);

  // Determina se duas mensagens são do mesmo remetente em sequência
  const isSequentialMessage = (currentMsg, index) => {
    if (index === 0) return false;
    return messages[index - 1].sender === currentMsg.sender;
  };

  // Sugestões de perguntas de biologia para o usuário iniciante
  const biologySuggestions = [
    "O que é fotossíntese?",
    "Como funciona a divisão celular?",
    "Quais são as diferenças entre DNA e RNA?",
    "Explique o que é seleção natural",
  ];

  return (
    <div className="chat-container">
      {/* NÚCLEO - CABEÇALHO DO CHAT */}
      <div className="chat-header">
        <div className="dna-helix"></div>
        <h1 className="chat-title">Assistente de Biologia</h1>
      </div>
      
      {/* CITOPLASMA - ÁREA DE MENSAGENS */}
      <div className="chat-box" ref={chatBoxRef}>
        {messages.length === 0 ? (
          <div className="welcome-container">
            <div className="welcome-message bot-message">
              <p>Olá! Sou seu assistente virtual especializado em biologia. Faça perguntas sobre:</p>
              <ul>
                <li>Genética e DNA</li>
                <li>Células e organismos</li>
                <li>Ecologia e meio ambiente</li>
                <li>Evolução e biodiversidade</li>
                <li>Fisiologia humana e animal</li>
              </ul>
              <p>Como posso ajudar você hoje?</p>
            </div>
            
            <div className="suggestions-container">
              {biologySuggestions.map((suggestion, index) => (
                <button 
                  key={index} 
                  className="suggestion-button"
                  onClick={() => {
                    setUserInput(suggestion);
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          groupMessagesByDate().map((group, groupIndex) => (
            <div key={`group-${groupIndex}`}>
              {/* SEPARADOR DE DIAS - COMO ANÉIS DE CRESCIMENTO */}
              <div className="date-separator">
                <span>{group.date}</span>
              </div>
              
              {/* CÉLULAS DE MENSAGEM - ESTRUTURA VISUAL */}
              {group.messages.map((msg, msgIndex) => {
                const isSequential = isSequentialMessage(msg, messages.indexOf(msg));
                const messageTime = msg.timestamp ? formatTime(new Date(msg.timestamp)) : '';
                const wrapperClass = msg.sender === 'user' ? 'user-wrapper' : 'bot-wrapper';
                const messageClass = msg.sender === 'user' ? 'user-message' : 'bot-message';
                
                return (
                  <div key={`msg-${groupIndex}-${msgIndex}`} className={`message-wrapper ${wrapperClass}`}>
                    <div className={`message ${messageClass}`}>
                      {msg.sender === 'bot' ? formatBoldText(msg.text) : msg.text}
                    </div>
                    <div className="message-info">
                      {messageTime}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        
        {/* INDICADOR DE DIGITAÇÃO - COMO DIVISÃO CELULAR */}
        {showTyping && (
          <div className="message-wrapper bot-wrapper">
            <div className="typing-indicator">
              <div className="typing-dots">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* RIBOSSOMA - ÁREA DE ENTRADA DE TEXTO */}
      <div className="input-area">
        <div className="input-container">
          <input
            className="message-input"
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Faça uma pergunta"
            disabled={isLoading}
          />
          <button 
            className="send-button" 
            onClick={handleSendMessage} 
            disabled={isLoading || !userInput.trim()}
            aria-label="Enviar mensagem"
          />
        </div>
      </div>
    </div>
  );
};

export default BiologyChatbot;