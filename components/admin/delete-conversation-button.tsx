'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'

export default function DeleteConversationButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  async function confirmDelete() {
    setLoading(true)
    const res = await fetch(`/api/admin/conversations/${id}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) location.reload()
  }
  return (
    <>
      <Button className="bg-red-600" onClick={() => setOpen(true)}>Delete</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
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