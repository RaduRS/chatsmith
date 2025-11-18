export interface Client {
  id: string
  email: string
  name: string
  api_key: string
  created_at: string
  updated_at: string
}

export interface Chatbot {
  id: string
  client_id: string
  name: string
  settings: { color: string; greeting: string }
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  chatbot_id: string
  client_id: string
  filename: string
  content: string
  embedding?: number[]
  created_at: string
}