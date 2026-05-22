import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';
import Icon from '../components/Icon';
import Confirm from '../components/Confirm';
import Skeleton from '../components/Skeleton';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';

export default function FileManager() {
  const { t, isAR, user } = useAppContext();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const data = await api.getFiles();
      setFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadFile(file);
      await fetchFiles();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
    e.target.value = null; // reset input
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await api.deleteFile(confirmDel._id);
      setFiles(f => f.filter(x => x._id !== confirmDel._id));
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmDel(null);
    }
  };

  const filtered = files.filter(f => 
    !search || 
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.itemId && f.itemId.name.toLowerCase().includes(search.toLowerCase())) ||
    (f.uploaderId && f.uploaderId.name.toLowerCase().includes(search.toLowerCase()))
  );

  const paginated = filtered.slice(0, page * LIMIT);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            {isAR ? 'مدير الملفات' : 'File Manager'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAR ? 'استعرض وتحكم في جميع الملفات والمستندات المرفوعة' : 'View and manage all uploaded files and documents'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Icon name="search" size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder={isAR ? 'بحث...' : 'Search...'}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap shadow-sm">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Icon name="add" size={16} />
            )}
            {isAR ? 'رفع ملف' : 'Upload File'}
            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">{isAR ? 'الملف' : 'File'}</th>
                <th className="px-6 py-4">{isAR ? 'مرتبط بـ' : 'Linked To'}</th>
                <th className="px-6 py-4">{isAR ? 'النوع' : 'Type'}</th>
                <th className="px-6 py-4">{isAR ? 'المرفوع بواسطة' : 'Uploaded By'}</th>
                <th className="px-6 py-4">{isAR ? 'التاريخ' : 'Date'}</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="animate-in fade-in duration-500">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 shrink-0" shape="rect" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32 mb-1" shape="text" />
                            <Skeleton className="h-3 w-12" shape="text" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-20" shape="rect" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-12" shape="rect" /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="w-6 h-6 shrink-0" shape="circle" />
                          <Skeleton className="h-4 w-24" shape="text" />
                        </div>
                      </td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16" shape="text" /></td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  ))}
                </>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    {isAR ? 'لا توجد ملفات' : 'No files found'}
                  </td>
                </tr>
              ) : paginated.map(f => (
                <tr key={f._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500 overflow-hidden">
                        {f.type.includes('image') ? (
                          <img src={f.url} alt={f.name} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="inventory" size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <a href={f.url} target="_blank" rel="noreferrer" className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-500 truncate block max-w-xs">
                          {f.name}
                        </a>
                        <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {f.itemId ? (
                      <span className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-1 rounded-md font-medium whitespace-nowrap">
                        {isAR ? f.itemId.name : (f.itemId.nameEn || f.itemId.name)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                      {f.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {f.uploaderId?.name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-medium">{f.uploaderId?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(f.createdAt).toLocaleDateString(isAR ? 'ar-EG' : 'en-US')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setConfirmDel(f)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title={isAR ? 'حذف' : 'Delete'}
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <InfiniteScrollTrigger 
        hasMore={page * LIMIT < filtered.length} 
        onVisible={() => setPage(p => p + 1)} 
      />
      
      {confirmDel && (
        <Confirm
          title={isAR ? 'تأكيد الحذف' : 'Confirm Deletion'}
          message={isAR ? `هل أنت متأكد من حذف الملف "${confirmDel.name}"؟` : `Are you sure you want to delete "${confirmDel.name}"?`}
          confirmText={isAR ? 'حذف' : 'Delete'}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
