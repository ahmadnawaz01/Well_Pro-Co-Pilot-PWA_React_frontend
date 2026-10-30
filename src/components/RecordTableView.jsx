import { Edit3, Trash2 } from 'lucide-react';

const IGNORED_KEYS = new Set([
  'owner', 'creation', 'modified', 'modified_by', 'docstatus', 'idx',
  'user', 'doctype', 'scoring_version'
]);

const formatFieldLabel = (key) => key.replace(/_/g, ' ').toUpperCase();

export function RecordTableView({ items, onEdit, onDelete, defaultCurrency = 'USD' }) {
  if (!items || items.length === 0) return null;

  // Extract all unique attribute keys present across all records
  const allKeysSet = new Set(['_timestamp', '_doctype', 'name', 'source']);
  items.forEach(item => {
    Object.keys(item).forEach(k => {
      if (!IGNORED_KEYS.has(k) && !allKeysSet.has(k)) {
        allKeysSet.add(k);
      }
    });
  });

  const columns = Array.from(allKeysSet);

  return (
    <div className="w-full max-w-full bg-[#121820]/90 backdrop-blur-xl border border-[#2a3644] rounded-2xl overflow-hidden shadow-xl font-mono text-xs my-2">
      <div className="overflow-x-auto max-w-full no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-[#1a232e] border-b border-[#2a3644] text-[#06b6d4] text-[10px] tracking-wider whitespace-nowrap">
              <th className="p-3 sticky left-0 bg-[#1a232e] z-10 shadow-md">ACTIONS</th>
              <th className="p-3">DATE / TIMESTAMP</th>
              <th className="p-3">DOCTYPE</th>
              <th className="p-3">ID</th>
              {columns.slice(4).map(col => (
                <th key={col} className="p-3">{formatFieldLabel(col)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a3644]/50 text-white">
            {items.map((item) => {
              const formattedDate = new Date(item._timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              const currencySymbol = item.currency || defaultCurrency;

              return (
                <tr key={item.name} className="hover:bg-[#1a232e]/50 transition-colors whitespace-nowrap">
                  {/* Actions Column Sticky at Left */}
                  <td className="p-3 sticky left-0 bg-[#121820] z-10 border-r border-[#2a3644]/50">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 text-[#8a99ad] hover:text-[#06b6d4] rounded-lg hover:bg-cyan-500/10 cursor-pointer"
                        title="Edit Record"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(item._doctype, item.name)}
                        className="p-1.5 text-[#8a99ad] hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  <td className="p-3 text-[#8a99ad]">{formattedDate}</td>
                  <td className="p-3 font-bold text-[#f43f5e]">{item._doctype}</td>
                  <td className="p-3 text-[10px] text-[#8a99ad]">{item.name}</td>

                  {/* Dynamic Attribute Columns */}
                  {columns.slice(4).map(col => {
                    const val = item[col];
                    if (val === undefined || val === null || val === '') {
                      return <td key={col} className="p-3 text-[#8a99ad]/40">-</td>;
                    }
                    return (
                      <td key={col} className="p-3 font-bold text-white max-w-xs truncate">
                        {typeof val === 'number' && (col.includes('amount') || col.includes('income') || col.includes('expense') || col.includes('savings') || col.includes('fund') || col.includes('debt'))
                          ? `${currencySymbol} ${val.toLocaleString()}`
                          : String(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecordTableView;
