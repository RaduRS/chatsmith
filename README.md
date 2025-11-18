# ChatSmith - Multi-Tenant AI Chatbot Platform

---

## **Project Overview**

ChatSmith is a multi-tenant SaaS platform that allows you (admin) to create and manage AI-powered RAG chatbots for multiple clients. Each client gets their own dashboard to upload documents and customize their chatbot, which they can embed on their website.

## **Two-Dashboard Architecture**

1. **Admin Dashboard** (`/admin`) - Your control center
2. **Client Dashboard** (`/dashboard`) - Client's self-service portal

---

## **Tech Stack**

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL + pgvector)
- **Authentication:** Supabase Auth
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS
- **AI:** OpenAI API (embeddings + GPT-4)
- **Deployment:** Vercel

---

## **Project Structure**

text

`chatsmith/ ├── app/ │   ├── (admin)/                    # Admin route group │   │   ├── admin/ │   │   │   ├── layout.tsx          # Admin layout with sidebar │   │   │   ├── page.tsx            # Admin dashboard home │   │   │   ├── clients/ │   │   │   │   ├── page.tsx        # List all clients │   │   │   │   └── [id]/ │   │   │   │       └── page.tsx    # Single client detail │   │   │   ├── chatbots/ │   │   │   │   ├── page.tsx        # List all chatbots │   │   │   │   └── [id]/ │   │   │   │       └── page.tsx    # Chatbot detail + analytics │   │   │   └── settings/ │   │   │       └── page.tsx        # Admin settings │   │   └── middleware.ts           # Admin auth check │   │ │   ├── (client)/                   # Client route group │   │   ├── dashboard/ │   │   │   ├── layout.tsx          # Client layout │   │   │   ├── page.tsx            # Client dashboard home │   │   │   ├── chatbot/ │   │   │   │   ├── page.tsx        # Manage chatbot │   │   │   │   ├── documents/ │   │   │   │   │   └── page.tsx    # Upload/manage docs │   │   │   │   ├── customize/ │   │   │   │   │   └── page.tsx    # Customize appearance │   │   │   │   └── embed/ │   │   │   │       └── page.tsx    # Get embed code │   │   │   └── analytics/ │   │   │       └── page.tsx        # View conversation logs │   │   └── middleware.ts           # Client auth check │   │ │   ├── (public)/                   # Public routes │   │   ├── page.tsx                # Landing page │   │   ├── login/ │   │   │   └── page.tsx            # Login page │   │   └── signup/ │   │       └── page.tsx            # Signup page │   │ │   ├── api/ │   │   ├── admin/ │   │   │   ├── clients/ │   │   │   │   └── route.ts        # CRUD clients │   │   │   └── chatbots/ │   │   │       └── route.ts        # Admin chatbot management │   │   ├── client/ │   │   │   ├── documents/ │   │   │   │   └── route.ts        # Upload/process documents │   │   │   ├── chatbot/ │   │   │   │   └── route.ts        # Update chatbot settings │   │   │   └── analytics/ │   │   │       └── route.ts        # Get analytics data │   │   ├── chat/ │   │   │   └── route.ts            # Public chat endpoint (for embedded widget) │   │   └── embed/ │   │       └── route.ts            # Serve embed widget │   │ │   └── embed/ │       └── [chatbotId]/ │           └── page.tsx            # Embeddable chat interface │ ├── components/ │   ├── admin/ │   │   ├── clients-table.tsx │   │   ├── chatbot-card.tsx │   │   └── analytics-chart.tsx │   ├── client/ │   │   ├── document-uploader.tsx │   │   ├── chatbot-customizer.tsx │   │   └── embed-code-generator.tsx │   ├── ui/                         # shadcn components │   │   ├── button.tsx │   │   ├── card.tsx │   │   ├── table.tsx │   │   └── ... │   └── shared/ │       ├── navbar.tsx │       ├── sidebar.tsx │       └── chat-interface.tsx │ ├── lib/ │   ├── supabase/ │   │   ├── client.ts               # Supabase client │   │   ├── server.ts               # Supabase server client │   │   └── admin.ts                # Supabase admin client │   ├── ai/ │   │   ├── embeddings.ts           # Generate embeddings │   │   ├── chat.ts                 # GPT chat completion │   │   └── rag.ts                  # RAG logic │   ├── utils/ │   │   ├── document-processor.ts   # Chunk documents │   │   ├── api-key-generator.ts    # Generate API keys │   │   └── validators.ts           # Zod schemas │   └── types/ │       └── index.ts                # TypeScript types │ ├── public/ │   ├── widget.js                   # Embed widget script │   └── ... │ ├── supabase/ │   ├── migrations/ │   │   └── 001_initial_schema.sql │   └── seed.sql │ ├── .env.local ├── .gitignore ├── next.config.js ├── package.json ├── tailwind.config.js └── tsconfig.json`

---

## **Database Schema (Supabase)**

sql

`-- Enable pgvector extension CREATE EXTENSION IF NOT EXISTS vector;  -- Admin user (you) CREATE TABLE admin_users (  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), email TEXT UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT NOW() );  -- Clients (your customers) CREATE TABLE clients (  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, api_key TEXT UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW() );  -- Chatbots (one per client for POC, can expand to multiple) CREATE TABLE chatbots (  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), client_id UUID REFERENCES clients(id) ON DELETE CASCADE, name TEXT NOT NULL DEFAULT 'My Chatbot', settings JSONB DEFAULT '{"color":"#000000","greeting":"Hello! How can I help?"}', created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW() );  -- Documents uploaded by clients CREATE TABLE documents (  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE, client_id UUID REFERENCES clients(id) ON DELETE CASCADE, filename TEXT NOT NULL, content TEXT NOT NULL, embedding vector(1536), created_at TIMESTAMP DEFAULT NOW() );  -- Create vector similarity search function CREATE OR REPLACE FUNCTION match_documents (  query_embedding vector(1536), match_threshold FLOAT, match_count INT, filter_client_id UUID ) RETURNS TABLE (  id UUID, content TEXT, similarity FLOAT ) LANGUAGE SQL STABLE AS $$  SELECT id, content, 1 - (embedding <=> query_embedding) AS similarity FROM documents WHERE client_id = filter_client_id AND 1 - (embedding <=> query_embedding) > match_threshold ORDER BY similarity DESC LIMIT match_count; $$;  -- Conversations (optional for analytics) CREATE TABLE conversations (  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE, client_id UUID REFERENCES clients(id) ON DELETE CASCADE, messages JSONB NOT NULL, created_at TIMESTAMP DEFAULT NOW() );  -- Row Level Security (RLS) ALTER TABLE clients ENABLE ROW LEVEL SECURITY; ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY; ALTER TABLE documents ENABLE ROW LEVEL SECURITY; ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;  -- Clients can only see their own data CREATE POLICY "Clients can view own data"  ON clients FOR SELECT USING (auth.uid() = id);  CREATE POLICY "Clients can view own chatbots"  ON chatbots FOR ALL USING (client_id = auth.uid());  CREATE POLICY "Clients can manage own documents"  ON documents FOR ALL USING (client_id = auth.uid());`

---

## **Core Features (POC Scope)**

## **Phase 1: Admin Dashboard** ✅ Start Here

**Must-have features:**

1. **Authentication**
    - Admin login (hardcoded admin email for POC)
    - Supabase Auth
1. **Clients Management** (`/admin/clients`)
    - View all clients (table with name, email, created date)
    - Create new client (form: name, email)
    - Auto-generate API key on client creation
    - View single client detail (shows associated chatbot)
    - Delete client
1. **Chatbots Overview** (`/admin/chatbots`)
    - List all chatbots across all clients (table view)
    - Click chatbot → view detail page
    - Chatbot detail shows: client name, document count, message count, created date
1. **Dashboard Home** (`/admin`)
    - Total clients count
    - Total chatbots count
    - Total documents uploaded
    - Total conversations (if tracking)

**Nice-to-have (Phase 2):**

- Analytics charts
- Search/filter clients
- Bulk actions

---

## **Phase 2: Client Dashboard**

**Must-have features:**

1. **Authentication**
    - Client signup/login
    - Supabase Auth with RLS
1. **Dashboard Home** (`/dashboard`)
    - Overview: document count, total messages
    - Quick link to upload documents
    - Quick link to get embed code
1. **Document Management** (`/dashboard/chatbot/documents`)
    - Upload documents (PDF, TXT)
    - List uploaded documents
    - Delete documents
    - Backend: chunk → embed → store in Supabase
1. **Embed Code** (`/dashboard/chatbot/embed`)
    - Display widget embed code
    - Copy to clipboard button
    - Show chatbot ID and API key
1. **Basic Customization** (`/dashboard/chatbot/customize`)
    - Set chatbot name
    - Set greeting message
    - Choose color (simple color picker)

**Nice-to-have (Phase 3):**

- Conversation logs/analytics
- Advanced customization (logo, position)
- Multiple chatbots per client

---

## **Phase 3: Embed Widget & Chat API**

**Must-have:**

1. **Chat API** (`/api/chat`)
    - Accept: `{ chatbot_id, api_key, message }`
    - Validate API key
    - Get embeddings for user message
    - Query vector DB for relevant docs (scoped to client_id)
    - Send to GPT-4 with context
    - Stream response back
1. **Embed Widget** (`/embed/[chatbotId]`)
    - Iframe-based chat interface
    - Uses client's API key and chatbot ID
    - Styled with Tailwind + shadcn/ui
    - Minimalist chat UI (POC)
1. **Widget Script** (`/public/widget.js`)
    - JavaScript snippet clients paste into their site
    - Creates iframe pointing to `/embed/[chatbotId]`

---

## **Development Principles**

## **DRY (Don't Repeat Yourself)**

- Reusable components in `/components/shared`
- Shared utilities in `/lib/utils`
- Single source of truth for types in `/lib/types`

## **Separation of Concerns**

- Route groups for admin/client/public
- API routes separated by feature
- Business logic in `/lib`, not in components

## **Best Coding Practices**

- TypeScript everywhere (strict mode)
- Zod for runtime validation
- Error handling with try/catch and proper error responses
- Server components by default, client components only when needed
- Environment variables for secrets

## **Proof of Concept Approach**

- Start with admin dashboard only
- Hard-code one admin user initially
- One chatbot per client (expand later)
- Basic UI (no fancy animations for POC)
- Focus on core functionality first

---

## **Environment Variables (.env.local)**

bash

`# Supabase NEXT_PUBLIC_SUPABASE_URL=your_supabase_url NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # OpenAI OPENAI_API_KEY=your_openai_key  # Admin (for POC, hardcode admin email) ADMIN_EMAIL=your@email.com  # App NEXT_PUBLIC_APP_URL=http://localhost:3000`

---

## **Phase 1 Implementation Order**

1. **Setup** (Day 1)
    - Initialize Next.js + TypeScript
    - Install shadcn/ui + Tailwind
    - Setup Supabase project
    - Run migrations
    - Configure env variables
1. **Admin Auth** (Day 1-2)
    - Create login page
    - Implement Supabase Auth
    - Protect `/admin` routes with middleware
1. **Admin Dashboard Home** (Day 2)
    - Create admin layout with sidebar
    - Build dashboard home with stat cards
    - Use shadcn Card component
1. **Clients Management** (Day 3-4)
    - `/admin/clients` page with table
    - API route for CRUD operations
    - Create client form (dialog/modal)
    - Generate API key utility
    - Single client detail page
1. **Chatbots Overview** (Day 5)
    - `/admin/chatbots` page
    - List all chatbots with client info
    - Chatbot detail page (basic info)

---

## **Key Files to Build First**

## **1. `/lib/supabase/client.ts`**

typescript

`import { createBrowserClient } from '@supabase/ssr'  export function createClient() {  return createBrowserClient( process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! ) }`

## **2. `/lib/types/index.ts`**

typescript

`export interface Client {  id: string email: string name: string api_key: string created_at: string updated_at: string }  export interface Chatbot {  id: string client_id: string name: string settings: { color: string greeting: string } created_at: string updated_at: string }  export interface Document {  id: string chatbot_id: string client_id: string filename: string content: string embedding?: number[] created_at: string }`

## **3. `/app/(admin)/admin/layout.tsx`**

typescript

`import { Sidebar } from '@/components/admin/sidebar'  export default function AdminLayout({  children, }: {  children: React.ReactNode }) {  return ( <div className="flex min-h-screen"> <Sidebar /> <main className="flex-1 p-8">{children}</main> </div> ) }`

## **4. `/app/api/admin/clients/route.ts`**

typescript

`import { NextResponse } from 'next/server' import { createClient } from '@/lib/supabase/server' import { generateApiKey } from '@/lib/utils/api-key-generator'  export async function GET() {  const supabase = createClient() const { data, error } = await supabase .from('clients') .select('*') .order('created_at', { ascending: false })   if (error) return NextResponse.json({ error: error.message }, { status: 500 }) return NextResponse.json(data) }  export async function POST(req: Request) {  const { name, email } = await req.json() const supabase = createClient()  const apiKey = generateApiKey()  const { data, error } = await supabase .from('clients') .insert({ name, email, api_key: apiKey }) .select() .single()   if (error) return NextResponse.json({ error: error.message }, { status: 500 }) return NextResponse.json(data) }`

---

## **Success Criteria for POC**

✅ Admin can log in

✅ Admin can create a new client

✅ Admin can view all clients in a table

✅ Admin can view chatbot details

✅ Admin dashboard shows basic stats

✅ Clean, professional UI with shadcn/ui

✅ Proper TypeScript types everywhere

✅ Code is modular and expandable

---

## **Next Steps After POC**

- Build client dashboard
- Implement document upload + RAG
- Create embed widget
- Add conversation logging
- Build analytics dashboard

---

# README (Revised)

## Overview

This document refines the original plan with clearer sections, proper code blocks, and concrete file scaffolding to accelerate implementation.

## Quick Start

- Install dependencies and set environment variables in `.env.local`
- Implement admin-only auth using Supabase and `ADMIN_EMAIL`
- Build admin dashboard pages first, followed by client dashboard and embed widget

## File Layout

```text
app/
  (admin)/admin/{layout.tsx,page.tsx,clients/page.tsx,chatbots/page.tsx,settings/page.tsx}
  (public)/{page.tsx,login/page.tsx,signup/page.tsx}
  api/admin/clients/route.ts
components/{admin/sidebar.tsx,ui/card.tsx}
lib/supabase/{client.ts,server.ts}
lib/types/index.ts
lib/utils/api-key-generator.ts
middleware.ts
```

## Env Required

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
ADMIN_EMAIL=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## API Example

```ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/utils/api-key-generator'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { name, email } = await req.json()
  const supabase = createServiceClient()
  const apiKey = generateApiKey()
  const { data, error } = await supabase
    .from('clients')
    .insert({ name, email, api_key: apiKey })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

## Admin Auth Notes

- Use Supabase session to authenticate
- After successful login and `email === ADMIN_EMAIL`, set a secure cookie to gate `/admin`

