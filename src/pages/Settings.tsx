import { useState, useRef } from 'react';
import { api } from '../api';
import { useAuthContext } from '../hooks/useAuth';
import { Upload, LogOut, FileText } from 'lucide-react';

export function Settings() {
  const { user, logout } = useAuthContext();
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
      setImportError('');
    }
  };

  const handleOpmlImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportResult(null);
    setImportError('');
    try {
      const text = await selectedFile.text();
      const result = await api.importOpml(text) as { total: number; success: number; failed: number };
      setImportResult(result);
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setImportError(`Import failed: ${err.message}`);
    }
    setImporting(false);
  };

  return (
    <div className="page settings">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <section className="settings-section">
        <h2>Account</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-row-label">
              Logged in as <strong>{user?.displayName || user?.username}</strong>
            </span>
            <button className="btn-secondary-danger" onClick={logout}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Import Podcasts (OPML)</h2>
        <div className="settings-card">
          <p className="hint" style={{ marginBottom: 14 }}>
            Export your subscriptions from Castbox (or any podcast app) as OPML, then import here.
          </p>
          <div className="opml-dropzone">
            <input
              ref={fileRef}
              id="opml-file"
              type="file"
              accept=".opml,.xml"
              onChange={handleFileSelect}
              className="opml-file-input"
            />
            <label htmlFor="opml-file" className="opml-browse-btn">
              <Upload size={15} /> Browse Files
            </label>
            {selectedFile && (
              <div className="opml-selected">
                <span className="opml-filename">
                  <FileText size={13} /> {selectedFile.name}
                </span>
                <button
                  className="btn-primary"
                  onClick={handleOpmlImport}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            )}
            {importing && <span className="hint">This may take a minute…</span>}
          </div>
          {importError && <div className="error-msg">{importError}</div>}
          {importResult && (
            <div className="import-result" style={{ marginTop: 12 }}>
              Imported {importResult.success} of {importResult.total} podcasts.
              {importResult.failed > 0 && ` (${importResult.failed} failed)`}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
