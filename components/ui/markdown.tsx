'use client'
export function Markdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/)
  const elements: React.ReactNode[] = []
  let list: string[] = []
  function flushList() {
    if (list.length > 0) {
      elements.push(
        <ul className="list-disc pl-5 space-y-1" key={`ul-${elements.length}`}>
          {list.map((item, idx) => (
            <li key={idx}>{formatInline(item)}</li>
          ))}
        </ul>
      )
      list = []
    }
  }
  function formatInline(s: string) {
    const parts: React.ReactNode[] = []
    let rest = s
    const boldRe = /\*\*(.+?)\*\*/
    while (true) {
      const m = rest.match(boldRe)
      if (!m) break
      const [all, content] = m
      const i = m.index ?? 0
      if (i > 0) parts.push(rest.slice(0, i))
      parts.push(<strong key={parts.length}>{content}</strong>)
      rest = rest.slice(i + all.length)
    }
    if (rest) parts.push(rest)
    return <>{parts}</>
  }
  for (const line of lines) {
    const l = line.trim()
    if (!l) { flushList(); continue }
    if (l.startsWith('### ')) {
      flushList()
      elements.push(
        <div className="font-semibold mt-2" key={`h3-${elements.length}`}>{formatInline(l.slice(4))}</div>
      )
      continue
    }
    if (l.startsWith('- ')) { list.push(l.slice(2)); continue }
    flushList()
    elements.push(<p className="mt-2" key={`p-${elements.length}`}>{formatInline(l)}</p>)
  }
  flushList()
  return <div className="space-y-1">{elements}</div>
}