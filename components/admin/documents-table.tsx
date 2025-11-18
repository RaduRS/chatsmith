"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

type Row = {
  id: string;
  filename: string;
  uploaded: string;
  clientName?: string;
  chatbotName?: string;
};

export default function DocumentsTable({
  rows: initialRows,
  showClient = true,
  showChatbot = true,
}: {
  rows: Row[];
  showClient?: boolean;
  showChatbot?: boolean;
}) {
  const [items, setItems] = useState<Row[]>(initialRows);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const allSelected = useMemo(
    () => items.length > 0 && items.every((r) => selected[r.id]),
    [items, selected]
  );
  const selectedIds = useMemo(
    () => items.filter((r) => selected[r.id]).map((r) => r.id),
    [items, selected]
  );

  function toggleAll() {
    const next: Record<string, boolean> = {};
    const value = !allSelected;
    for (const r of items) next[r.id] = value;
    setSelected(next);
  }

  async function confirmDelete() {
    setLoading(true);
    const res = await fetch("/api/admin/documents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });
    setLoading(false);
    if (res.ok) {
      setItems(items.filter((r) => !selected[r.id]));
      setSelected({});
      setOpen(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Selected: {selectedIds.length}
        </div>
        <Button
          variant="destructive"
          onClick={() => setOpen(true)}
          disabled={selectedIds.length === 0}
        >
          Delete Selected
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">
              <Checkbox checked={allSelected} onCheckedChange={() => toggleAll()} />
            </th>
            <th className="p-2">File</th>
            {showClient && <th className="p-2">Client</th>}
            {showChatbot && <th className="p-2">Chatbot</th>}
            <th className="p-2">Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">
                <Checkbox
                  checked={!!selected[r.id]}
                  onCheckedChange={(v) => setSelected({ ...selected, [r.id]: v })}
                />
              </td>
              <td className="p-2">{r.filename}</td>
              {showClient && <td className="p-2">{r.clientName ?? "—"}</td>}
              {showChatbot && <td className="p-2">{r.chatbotName ?? "—"}</td>}
              <td className="p-2">{r.uploaded}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td
                className="p-4 text-gray-500"
                colSpan={showClient && showChatbot ? 5 : 4}
              >
                No documents found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete documents</DialogTitle>
            <DialogDescription>
              This will delete {selectedIds.length} document(s).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose onClick={() => setOpen(false)} />
            <Button
              className="bg-red-600"
              onClick={confirmDelete}
              disabled={loading}
            >
              {loading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
