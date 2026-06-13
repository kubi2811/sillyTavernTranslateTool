import React from 'react';
import { LorebookEntry } from '../types';
import { Plus, Search, Book, FileText, Trash2, Copy } from 'lucide-react';

interface LorebookListProps {
  entries: LorebookEntry[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onDuplicate: (entry: LorebookEntry) => void;
}

export const LorebookList: React.FC<LorebookListProps> = ({
  entries,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
}) => {
  const [search, setSearch] = React.useState('');

  const filteredEntries = entries.filter(e => {
    const term = search.toLowerCase();
    const comment = e.comment.toLowerCase();
    const keys = e.key.join(', ').toLowerCase();
    return comment.includes(term) || keys.includes(term);
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700 w-80 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-900 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Book className="text-indigo-500" size={20} />
            Mục lục
          </h2>
          <button 
            onClick={onAdd}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors shadow-lg shadow-indigo-500/20"
            title="Thêm mục mới"
          >
            <Plus size={18} />
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Tìm kiếm..." 
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {filteredEntries.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            Không tìm thấy mục nào.
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div 
              key={entry.uid}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent ${
                selectedId === entry.uid 
                  ? 'bg-slate-800 border-slate-700 shadow-md' 
                  : 'hover:bg-slate-800/50 hover:border-slate-800'
              }`}
              onClick={() => onSelect(entry.uid)}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`shrink-0 w-1.5 h-8 rounded-full ${entry.enabled ? 'bg-indigo-500' : 'bg-slate-600'}`}></div>
                <div className="truncate">
                  <div className={`font-medium truncate text-sm ${selectedId === entry.uid ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                    {entry.comment || "Mục chưa đặt tên"}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {entry.key.length > 0 ? entry.key.join(', ') : '(Chưa có từ khóa)'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); onDuplicate(entry); }}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-colors"
                  title="Nhân bản"
                >
                  <Copy size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(entry.uid); }}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                  title="Xóa"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-2 border-t border-slate-700 text-xs text-center text-slate-500 bg-slate-900">
        {filteredEntries.length} mục
      </div>
    </div>
  );
};