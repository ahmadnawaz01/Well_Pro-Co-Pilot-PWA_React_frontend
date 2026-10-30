import { useState, useEffect } from 'react';
import { feedService } from '../services/feedService';
import { dashboardService } from '../services/dashboardService';
import { extractFrappeError } from '../services/apiClient';
import { X, Edit3, Save } from 'lucide-react';

const PROTECTED_FIELDS = new Set([
  'name', 'owner', 'creation', 'modified', 'modified_by', 'docstatus', 'idx',
  '_doctype', '_timestamp', 'user', 'doctype', 'source', 'scoring_version'
]);

const formatFieldLabel = (key) => key.replace(/_/g, ' ').toUpperCase();

export function EditRecordModal({ isOpen, item, onClose, onSuccess }) {
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      const editableData = {};
      Object.entries(item).forEach(([key, val]) => {
        if (!PROTECTED_FIELDS.has(key)) {
          editableData[key] = val !== null && val !== undefined ? val : '';
        }
      });
      setFields(editableData);
      setError('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleFieldChange = (key, value) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const update_data = {};
    Object.entries(fields).forEach(([key, val]) => {
      if (val === '' || val === null || val === undefined) return;

      // Retain numerical type for amounts, scores, ratings, and counts
      if (typeof item[key] === 'number' || (!isNaN(val) && val !== '' && !key.includes('date') && !key.includes('time') && key !== 'logged_at')) {
        update_data[key] = Number(val);
      } else {
        update_data[key] = val;
      }
    });

    try {
      await feedService.updateRecord(item._doctype, item.name, update_data);

      // Extract effective date for score recalculation
      const recordDate =
        fields.transaction_date ||
        fields.record_date ||
        fields.snapshot_date ||
        fields.date ||
        (fields.logged_at ? String(fields.logged_at).split(' ')[0] : undefined);

      if (recordDate) {
        try {
          await dashboardService.recalculateScore(recordDate);
        } catch {
          // Backend might have already auto-recalculated
        }
      }

      onSuccess(recordDate);
      onClose();
    } catch (err) {
      setError(extractFrappeError(err, 'Failed to update record'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-[#121820] border border-[#2a3644] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[#2a3644] pb-3">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-[#06b6d4]" />
            <div>
              <h3 className="font-bold text-white text-base">Edit {item._doctype}</h3>
              <span className="font-mono text-[10px] text-[#8a99ad] block">ID: {item.name}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#8a99ad] hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 rounded-xl font-mono text-xs">
            ERR: {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-3 font-mono text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(fields).map(([key, value]) => {
              const isLongText = key === 'description' || key === 'notes' || key === 'raw_input';

              if (isLongText) {
                return (
                  <div key={key} className="col-span-1 sm:col-span-2">
                    <label className="text-[10px] text-[#8a99ad] block mb-1">
                      {formatFieldLabel(key)}
                    </label>
                    <textarea
                      value={value}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl h-20 resize-none focus:outline-none focus:border-[#06b6d4]"
                    />
                  </div>
                );
              }

              return (
                <div key={key}>
                  <label className="text-[10px] text-[#8a99ad] block mb-1 truncate">
                    {formatFieldLabel(key)}
                  </label>
                  <input
                    type={typeof item[key] === 'number' ? 'number' : 'text'}
                    step="any"
                    value={value}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl focus:outline-none focus:border-[#06b6d4]"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#06b6d4] to-[#a855f7] text-black font-bold py-3 mt-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'UPDATING...' : 'SAVE CHANGES'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditRecordModal;
