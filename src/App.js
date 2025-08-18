
import React, { useState } from 'react';
import * as ReactDOM from 'react-dom';
import './App.css';
import Chatbot from './Chatbot.js';



// Modal Sobre o Bot

// Toast/Alerta Sobre o Bot
function InfoBotToast({ open, onClose }) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="info-bot-toast-overlay" onClick={onClose}>
      <div className="info-bot-toast" onClick={e => e.stopPropagation()} tabIndex={-1}>
        <button className="close-toast-btn" onClick={onClose} aria-label="Fechar">&times;</button>
        <h2 style={{fontSize:'1.1rem', marginBottom:8}}>🤖 Assistente Gemini IFPR</h2>
        <p style={{fontStyle:'italic', color:'#388e3c', marginBottom:8}}>Seu companheiro inteligente para dúvidas e aprendizado!</p>
        <div style={{color:'#333', fontSize:'0.98rem', marginBottom:8}}>
          <p>O Assistente Gemini IFPR é um chatbot criado para apoiar alunos e professores do IFPR, respondendo dúvidas, auxiliando no aprendizado e explorando temas de tecnologia e inteligência artificial. Utiliza a API Gemini do Google para fornecer respostas inteligentes e pode ser expandido com novas funções, como Function Calling.</p>
          <p>Ideal para quem busca agilidade, praticidade e inovação no dia a dia acadêmico!</p>
        </div>
        <div style={{fontSize:'0.97rem', color:'#2e7d32'}}>
          <strong>Desenvolvido por:</strong>
          <ul style={{margin:'4px 0 0 1.2em'}}>
            <li>Paulo Neto</li>
            {/* Adicione outros membros da equipe aqui */}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
}




function HistoricoModal({ open, onClose, historicos, onSelect, conversaSelecionada }) {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="info-bot-toast-overlay" onClick={onClose}>
      <div className="info-bot-toast" onClick={e => e.stopPropagation()} tabIndex={-1} style={{maxWidth:600, width:'96vw', minHeight:220}}>
        <button className="close-toast-btn" onClick={onClose} aria-label="Fechar">&times;</button>
        <h2 style={{fontSize:'1.1rem', marginBottom:8}}>Histórico de Conversas</h2>
        {!conversaSelecionada ? (
          <ul style={{listStyle:'none', padding:0, margin:0, maxHeight:260, overflowY:'auto'}}>
            {historicos && historicos.length > 0 ? historicos.map(sessao => (
              <li key={sessao.sessionId} style={{marginBottom:8}}>
                <button style={{width:'100%', textAlign:'left', background:'#f1f8e9', border:'1px solid #c8e6c9', borderRadius:8, padding:'8px 12px', cursor:'pointer'}} onClick={() => onSelect(sessao)}>
                  Conversa de {new Date(sessao.startTime).toLocaleString('pt-BR')}
                </button>
              </li>
            )) : <li>Nenhum histórico encontrado.</li>}
          </ul>
        ) : (
          <div>
            <button style={{marginBottom:8, background:'#e0e0e0', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer'}} onClick={()=>onSelect(null)}>← Voltar</button>
            <div style={{maxHeight:260, overflowY:'auto', background:'#f9f9f9', borderRadius:8, padding:'8px'}}>
              {conversaSelecionada.messages.map((msg, idx) => (
                <div key={idx} style={{textAlign: msg.sender==='user'?'right':'left', marginBottom:6}}>
                  <span style={{background: msg.sender==='user'?'#c8e6c9':'#e3f2fd', color:'#222', borderRadius:8, padding:'4px 10px', display:'inline-block'}}>{msg.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicos, setHistoricos] = useState([]);
  const [conversaSelecionada, setConversaSelecionada] = useState(null);

  // Busca históricos do backend
  async function buscarHistoricos() {
    try {
      const resp = await fetch('https://chatbot-back-end-ja4v.onrender.com/api/chat/historicos');
      const data = await resp.json();
      setHistoricos(data);
    } catch (e) {
      setHistoricos([]);
    }
  }

  function abrirHistorico() {
    buscarHistoricos();
    setHistoricoOpen(true);
    setConversaSelecionada(null);
  }

  return (
    <div className="App" style={{minHeight: '100vh', background: 'var(--beige-background)', display: 'flex', flexDirection: 'column'}}>
      <header className="app-header" style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'18px 32px 10px 32px', background:'#fff', boxShadow:'0 2px 8px #e0e0e0',
        position:'sticky', top:0, zIndex:10, minHeight:64
      }}>
        <span style={{fontWeight:700, fontSize:'1.3rem', color:'#2e7d32', letterSpacing:1}}>Assistente Gemini IFPR</span>
        <div style={{display:'flex', gap:12}}>
          <button className="sobre-btn" onClick={() => setModalOpen(true)} style={{background:'#43a047', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:600, fontSize:'1rem', cursor:'pointer'}}>Sobre</button>
          <button className="sobre-btn" onClick={abrirHistorico} style={{background:'#388e3c', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:600, fontSize:'1rem', cursor:'pointer'}}>Histórico</button>
        </div>
      </header>
      <main>
        <div className="main-chat-container">
          <Chatbot />
        </div>
      </main>
      <InfoBotToast open={modalOpen} onClose={() => setModalOpen(false)} />
      <HistoricoModal open={historicoOpen} onClose={()=>setHistoricoOpen(false)} historicos={historicos} onSelect={setConversaSelecionada} conversaSelecionada={conversaSelecionada} />
    </div>
  );
}

export default App;
