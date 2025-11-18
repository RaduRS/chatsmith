'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'

export default function DeleteChatbotButton({ id }: { id: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  async function confirmDelete() {
    setLoading(true)
    const res = await fetch(`/api/admin/chatbots/${id}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) router.push('/admin/chatbots')
  }
  return (
    <>
      <Button className="bg-red-600" onClick={() => setOpen(true)}>Delete Chatbot</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chatbot</DialogTitle>
            <DialogDescription>This will remove the chatbot and its documents.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose onClick={() => setOpen(false)} />
            <Button className="bg-red-600" onClick={confirmDelete}>{loading ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}