import React, { useState, useEffect } from 'react';
import { Trash2, Plus, RefreshCw, ArrowLeft, Check, Lock, Unlock, AlertCircle } from 'lucide-react';
import {
  FounderCoreSyncDoc,
  fetchAllFounderCoreSync,
  saveFounderCoreSyncDoc,
  deleteFounderCoreSyncDoc,
  FIRESTORE_COLLECTION,
} from '../lib/firestoreSync';

interface CoreSyncInternalViewProps {
  onBack: () => void;
}

export const CoreSyncInternalView: React.FC<CoreSyncInternalViewProps> = ({ onBack }) => {
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('agni_coresync_unlocked') === 'true';
  });
  const [error, setError] = useState<string | null>(null);

  const [docs, setDocs] = useState<FounderCoreSyncDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState('all');

  // Test add form
  const [newSpeaker, setNewSpeaker] = useState<'Sanjay' | 'Hasini'>('Sanjay');
  const [newAboutWhom, setNewAboutWhom] = useState<'Sanjay' | 'Hasini'>('Hasini');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllFounderCoreSync();
      setDocs(data);
    } catch {
      showToast('Error loading Firestore documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadData();
    }
  }, [isUnlocked]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === 'qprwqwer' || passcode.trim() === 'qprwqwertyuio') {
      setIsUnlocked(true);
      sessionStorage.setItem('agni_coresync_unlocked', 'true');
      setError(null);
    } else {
      setError('Invalid passcode.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete document from Firestore collection founder_core_sync?')) return;
    const ok = await deleteFounderCoreSyncDoc(id);
    if (ok) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
      showToast('Deleted from Firestore founder_core_sync');
    } else {
      showToast('Failed to delete document');
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    const added = await saveFounderCoreSyncDoc({
      speaker: newSpeaker,
      aboutWhom: newAboutWhom,
      memoryText: newMemoryText.trim(),
      timestamp: new Date().toISOString(),
      userEmail: newSpeaker === 'Sanjay' ? 'muralisanjayyadav@gmail.com' : 'itzmehasu94444@gmail.com',
    });
    if (added) {
      setDocs((prev) => [added, ...prev]);
      setNewMemoryText('');
      setShowAddForm(false);
      showToast('Document saved to Firestore founder_core_sync');
    } else {
      showToast('Failed to save document to Firestore');
    }
  };

  const filteredDocs = docs.filter((d) => {
    const matchesSearch =
      (d.memoryText || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.id || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (speakerFilter === 'sanjay') return d.speaker === 'Sanjay';
    if (speakerFilter === 'hasini') return d.speaker === 'Hasini';
    return true;
  });

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-black text-neutral-300 flex items-center justify-center p-4 font-mono">
        <div className="w-full max-w-xs bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono text-sm text-center focus:outline-none focus:border-neutral-600"
            />
            {error && <div className="text-[11px] text-red-500 text-center">{error}</div>}
            <button
              type="submit"
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Enter
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onBack}
                className="text-[11px] text-neutral-500 hover:text-neutral-300"
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-200 p-4 sm:p-8 font-mono text-xs">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-800 text-white px-4 py-1.5 rounded-full text-[11px] shadow-lg border border-neutral-700 animate-in fade-in">
          {toast}
        </div>
      )}

      {/* Top Stealth Bar - NO TITLE (Per user requirement) */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-900 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors py-1 px-2.5 rounded bg-neutral-950 border border-neutral-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 font-mono">
            collection: {FIRESTORE_COLLECTION}
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-900"
            title="Reload from Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Manual Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddDoc} className="mb-6 p-4 bg-neutral-950 border border-neutral-900 rounded-xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Speaker</label>
              <select
                value={newSpeaker}
                onChange={(e: any) => setNewSpeaker(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-300"
              >
                <option value="Sanjay">Sanjay</option>
                <option value="Hasini">Hasini</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">About Whom</label>
              <select
                value={newAboutWhom}
                onChange={(e: any) => setNewAboutWhom(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-300"
              >
                <option value="Hasini">Hasini</option>
                <option value="Sanjay">Sanjay</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Memory Text</label>
            <input
              type="text"
              value={newMemoryText}
              onChange={(e) => setNewMemoryText(e.target.value)}
              placeholder='e.g. Hasini likes cats / Sanjay loves quantum physics'
              className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded font-bold"
            >
              Save to Firestore
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter..."
          className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-900 rounded text-neutral-300"
        />
        <select
          value={speakerFilter}
          onChange={(e) => setSpeakerFilter(e.target.value)}
          className="px-3 py-1.5 bg-neutral-950 border border-neutral-900 rounded text-neutral-400"
        >
          <option value="all">All Speakers</option>
          <option value="sanjay">Sanjay</option>
          <option value="hasini">Hasini</option>
        </select>
      </div>

      {/* Real Firestore Data Table */}
      <div className="border border-neutral-900 rounded-xl overflow-hidden bg-neutral-950">
        <table className="w-full text-left">
          <thead className="bg-neutral-900 text-neutral-500 text-[10px] uppercase">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Speaker</th>
              <th className="px-3 py-2">About</th>
              <th className="px-3 py-2">Memory Text</th>
              <th className="px-3 py-2">Timestamp</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900 text-[11px]">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-neutral-600">
                  {loading ? 'Fetching from Firestore cloud...' : 'No documents in founder_core_sync'}
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-neutral-900/50">
                  <td className="px-3 py-2 text-neutral-600 font-mono">{doc.id.slice(0, 10)}...</td>
                  <td className="px-3 py-2 text-neutral-300 font-bold">{doc.speaker}</td>
                  <td className="px-3 py-2 text-amber-500 font-bold">{doc.aboutWhom}</td>
                  <td className="px-3 py-2 text-white max-w-md break-words">{doc.memoryText}</td>
                  <td className="px-3 py-2 text-neutral-500 font-mono">
                    {new Date(doc.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-900 transition-colors"
                      title="Delete from Firestore"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CoreSyncInternalView;
