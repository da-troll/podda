import { useState, useRef } from 'react';
import { api } from '../api';
import { useAuthContext } from '../hooks/useAuth';
import { Upload, LogOut } from 'lucide-react';

export function Settings() {
  const { user, logout } = useAuthContext();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleOpmlImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setImportError('');
    try {
      const text = await file.text();
      const result = await api.importOpml(text) as { total: number; success: number; failed: number };
      setImportResult(result);
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
        <div className="settings-row">
          <span>Logged in as <strong>{user?.displayName || user?.username}</strong></span>
          <button className="btn-secondary" onClick={logout}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Import Podcasts (OPML)</h2>
        <p className="hint">Export your subscriptions from Castbox (or any podcast app) as OPML, then import here.</p>
        <div className="settings-row">
          <input
            ref={fileRef}
            type="file"
            accept=".opml,.xml"
            onChange={handleOpmlImport}
          />
          {importing && <span className="hint">Importing... this may take a minute.</span>}
        </div>
        {importError && <div className="error-msg">{importError}</div>}
        {importResult && (
          <div className="import-result">
            Imported {importResult.success} of {importResult.total} podcasts.
            {importResult.failed > 0 && ` (${importResult.failed} failed)`}
          </div>
        )}
      </section>
    </div>
  );
}
