'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteEntry } from '@/lib/api';

export function DeleteButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = confirm(`确定要删除「${name}」吗？此操作不可撤销。`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteEntry(id);
      toast.success('已删除该图鉴条目');
      router.push('/codex');
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除失败';
      toast.error(message);
      setDeleting(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Trash2 />
      )}
      删除
    </Button>
  );
}
