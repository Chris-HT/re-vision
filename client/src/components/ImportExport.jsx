import { useState, useRef } from 'react';

export function ExportButton({ subjectId, subjectName }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/export`);
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `re-vision-${subjectId}-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export subject');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="p-1.5 rounded hover:bg-slate-600 transition-colors"
      title={`Export ${subjectName || 'subject'}`}
    >
      <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </button>
  );
}

export function ImportButton({ onImported }) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.subject || !data.questionFiles) {
        alert('Invalid file format. Please select a RE-VISION export file.');
        return;
      }

      const totalQuestions = Object.values(data.questionFiles)
        .reduce((sum, qf) => sum + (qf.questions?.length || 0), 0);
      const totalCategories = new Set(
        Object.values(data.questionFiles)
          .flatMap(qf => Object.keys(qf.categories || {}))
      ).size;

      setPreview({
        data,
        name: data.subject.name,
        questions: totalQuestions,
        categories: totalCategories
      });
    } catch (err) {
      alert('Failed to read file. Make sure it is a valid JSON file.');
    }

    // Reset input
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const res = await fetch('/api/subjects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview.data)
      });
      if (!res.ok) throw new Error('Import failed');
      const result = await res.json();
      setPreview(null);
      onImported?.(result);
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import subject');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 rounded-lg border transition-all hover:scale-105 text-sm font-medium"
        style={{
          backgroundColor: 'var(--bg-card-solid)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)'
        }}
      >
        Import Subject
      </button>

      {/* Import preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 max-w-md w-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Import Preview</h3>
            <div className="space-y-2 mb-6" style={{ color: 'var(--text-secondary)' }}>
              <p><strong style={{ color: 'var(--text-primary)' }}>Subject:</strong> {preview.name}</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Questions:</strong> {preview.questions}</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Categories:</strong> {preview.categories}</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
