import Link from 'next/link'
import { LayoutDashboard, Users, Bot, MessageSquare, FileText } from 'lucide-react'

export function Sidebar() {
  const item = (href: string, label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100">
      <Icon className="h-5 w-5 text-gray-700" />
      <span className="text-sm font-medium text-gray-900">{label}</span>
    </Link>
  )
  return (
    <aside className="w-80 bg-white/80 backdrop-blur border-r">
      <div className="p-6 border-b bg-gradient-to-r from-black to-gray-800 text-white">
        <div className="text-xl font-semibold">ChatSmith</div>
        <div className="text-xs text-white/70">Admin</div>
      </div>
      <nav className="p-4 space-y-1">
        {item('/admin', 'Dashboard', LayoutDashboard)}
        {item('/admin/clients', 'Clients', Users)}
        {item('/admin/chatbots', 'Chatbots', Bot)}
        {item('/admin/documents', 'Documents', FileText)}
        {item('/admin/conversations', 'Conversations', MessageSquare)}
      </nav>
    </aside>
  )
}