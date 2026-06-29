'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Document = {
  id: string;
  filename: string;
  file_size: number | null;
  status: string;
  created_at: string;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export default function KnowledgeBaseUploader({
  orgId,
  userId,
  initialDocuments,
}: {
  orgId: string;
  userId: string;
  initialDocuments: Document[];
}) {
  const supabase = createClient();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const allowed = ['application/pdf', 'text/plain'];
      if (!allowed.includes(file.type)) {
        setError(`${file.name}: only PDF and TXT files are supported right now.`);
        continue;
      }

      const path = `${orgId}/${Date.now()}-${file.name}`;

      // 1. Upload the actual file bytes to Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file);

      if (uploadError) {
        setError(`${file.name}: ${uploadError.message}`);
        continue;
      }

      // 2. Insert the metadata row
      const { data: row, error: insertError } = await supabase
        .from('documents')
        .insert({
          org_id: orgId,
          uploaded_by: userId,
          filename: file.name,
          file_path: path,
          file_size: file.size,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError) {
        setError(`${file.name}: ${insertError.message}`);
        continue;
      }

      setDocuments((prev) => [row as Document, ...prev]);
    }

    setUploading(false);
  };

  const handleDelete = async (doc: Document) => {
    await supabase.from('documents').delete().eq('id', doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  return (
    <div>
      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300
          ${isDragging
            ? 'border-blue-400 bg-blue-500/10 scale-[1.01]'
            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="mx-auto w-20 h-20 mb-4 relative">
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-10"></div>
          <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.25)]">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            ) : (
              <UploadCloud className="h-8 w-8 text-blue-400" />
            )}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          {uploading ? 'Uploading...' : 'Drag & drop files here'}
        </h3>
        <p className="text-slate-400 text-sm">
          or click to browse — PDF and TXT supported
        </p>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Document List */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Uploaded Documents ({documents.length})
        </h4>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
          {documents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No documents yet. Upload your first file above.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-5 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-purple-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{doc.filename}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString()} · {formatBytes(doc.file_size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full
                    ${doc.status === 'ready'
                      ? 'bg-green-500/10 text-green-400'
                      : doc.status === 'failed'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-yellow-500/10 text-yellow-400'}`}>
                    {doc.status === 'ready' && <CheckCircle2 size={12} />}
                    {doc.status === 'processing' && <Loader2 size={12} className="animate-spin" />}
                    {doc.status}
                  </span>
                  <button onClick={() => handleDelete(doc)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}