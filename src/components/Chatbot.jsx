import { useState, useEffect, useRef } from 'react'
import { X, Send, Trash2, Bot, Loader2, Image as ImageIcon } from 'lucide-react'
import { HfInference } from '@huggingface/inference'

const STORAGE_KEY = 'iss-chat-history'
const MAX_MESSAGES = 30
const HF_TOKEN = import.meta.env.VITE_AI_TOKEN
const hf = new HfInference(HF_TOKEN)

export default function Chatbot({ context }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : [{
        id: 1,
        role: 'bot',
        content: "Hi! I'm your ISS assistant. Ask me about the ISS, news, or generate a space image!",
        timestamp: Date.now(),
      }]
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)))
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const generateImage = async (prompt) => {
    try {
      const blob = await hf.textToImage({
        model: "stabilityai/stable-diffusion-xl-base-1.0",
        inputs: prompt,
        parameters: { num_inference_steps: 25 },
      })
      return URL.createObjectURL(blob)
    } catch (err) {
      console.error('Image gen failed:', err)
      return null
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    const userMsg = { id: Date.now(), role: 'user', content: userMessage, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Check for image generation request
      if (/image|picture|draw|generate/i.test(userMessage)) {
        const imageUrl = await generateImage(userMessage)
        if (imageUrl) {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            role: 'bot',
            content: "Here is your generated image:",
            image: imageUrl,
            timestamp: Date.now()
          }])
          setLoading(false)
          return
        }
      }

      // Format Dashboard Data for the prompt
      const dashboardInfo = `
        ISS Position: Lat ${context.issData?.lat?.toFixed(4) || '---'}, Lon ${context.issData?.lon?.toFixed(4) || '---'}
        ISS Speed: ${context.issSpeed?.toLocaleString() || '---'} km/h
        People in Space: ${context.astronauts?.number || '---'}
        News Categories: ${Object.keys(context.newsData || {}).join(', ')}
      `

      // Use the OpenAI-compatible endpoint as requested
      const response = await fetch(
        "https://router.huggingface.co/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistralai/Mistral-7B-Instruct-v0.2",
            messages: [
              {
                role: "system",
                content: `
                  You are an ISS Dashboard Assistant.
                  IMPORTANT RULES:
                  - ONLY answer from provided dashboard data
                  - If data not available say: "I only answer using dashboard data."
                  Dashboard Data: ${dashboardInfo}
                `,
              },
              {
                role: "user",
                content: userMessage,
              },
            ],
            max_tokens: 200,
            temperature: 0.5,
          }),
        }
      );

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "I only answer using dashboard data.";
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        content: reply,
        timestamp: Date.now()
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        content: `⚠️ Error: ${err.message}. Please check your AI Token.`,
        timestamp: Date.now()
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button className="chatbot-fab" onClick={() => setOpen(!open)} id="chatbot-fab">
        {open ? <X /> : <Bot />}
      </button>

      {open && (
        <div className="chatbot-window" id="chatbot-window">
          <div className="chatbot-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bot size={20} color="white" />
              <span style={{ fontWeight: 700, color: 'white' }}>ISS AI Assistant</span>
            </div>
            <button onClick={() => setMessages([messages[0]])} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <Trash2 size={16} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.role}`}>
                {msg.content}
                {msg.image && (
                  <img src={msg.image} alt="Generated" style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />
                )}
              </div>
            ))}
            {loading && (
              <div className="typing-indicator" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px' }}>
                <Loader2 className="spinning" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Assistant is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input
              className="chatbot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything..."
              id="chatbot-input"
            />
            <button className="chatbot-send" onClick={sendMessage} disabled={loading} id="chatbot-send-btn">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
