import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, Trash2, Bot, Loader2, Image as ImageIcon } from 'lucide-react'
import { HfInference } from '@huggingface/inference'

const STORAGE_KEY = 'iss-chat-history'
const MAX_MESSAGES = 30
const HF_TOKEN = import.meta.env.VITE_AI_TOKEN

// Using a more reliable model for the free Inference API that supports Chat Completion
const MODEL = 'microsoft/Phi-3-mini-4k-instruct'
const IMG_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0'

const hf = new HfInference(HF_TOKEN)

function buildSystemPrompt(context) {
  const { issData, issSpeed, astronauts, newsData } = context

  const issInfo = issData
    ? `Current ISS Position: Lat ${issData.lat.toFixed(2)}°, Lon ${issData.lon.toFixed(2)}°. Speed: ${issSpeed?.toLocaleString()} km/h.`
    : 'ISS data loading...'

  const astroInfo = astronauts?.number 
    ? `People in space: ${astronauts.number}.`
    : ''

  const newsInfo = newsData && Object.keys(newsData).length > 0
    ? 'Recent news topics: ' + Object.keys(newsData).join(', ')
    : 'News loading...'

  return `You are an ISS Dashboard AI. Answer ONLY based on this data:
ISS: ${issInfo}
Space: ${astroInfo}
News: ${newsInfo}
Rules:
1. Be very concise.
2. If asked for an image, the generator will handle it.
3. If data is missing, say you don't know.`
}

export default function Chatbot({ context }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : [{
        id: 1,
        role: 'bot',
        content: "Hello! I can answer questions about the ISS and News, or generate space images!",
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
        model: IMG_MODEL,
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

    const userMsg = { id: Date.now(), role: 'user', content: input.trim(), timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const isImageRequest = /image|picture|draw|generate/i.test(userMsg.content)
      
      if (isImageRequest) {
        const imageUrl = await generateImage(userMsg.content)
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

      // Use chatCompletion for models that support conversational task
      const response = await hf.chatCompletion({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(context) },
          ...messages.slice(-5).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: userMsg.content }
        ],
        max_tokens: 200,
        temperature: 0.7,
      })

      const reply = response.choices[0].message.content
      
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
        content: `⚠️ Assistant Error: ${err.message}. Please verify your API Token.`,
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
