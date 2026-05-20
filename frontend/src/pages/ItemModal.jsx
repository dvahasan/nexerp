import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';

const ITEM_TYPES = ['unit', 'box', 'pack', 'group', 'roll', 'bag', 'pallet'];

const defaultForm = {
  name: '', nameEn: '', sku: '', barcode: '', price: '', qty: '',
  minThreshold: '', type: 'unit', unitsPerPackage: 1, datasheet: '',
  deptId: '', catId: '', status: 'active',
};

export default function ItemModal({ open, onClose, editItem = null }) {
  const { depts, cats, saveItem, t, isAR } = useAppContext();
  const [form, setForm]       = useState(defaultForm);
  const [saving, setSaving]   = useState(false);
  const [tab, setTab]         = useState('info');      // 'info' | 'photos'
  const [photos, setPhotos]   = useState([]);          // existing photos
  const [newFile, setNewFile] = useState(null);        // staged main photo
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState(null);    // publicId being deleted

  // Populate form when editing
  useEffect(() => {
    if (editItem) {
      setForm({
        name:            editItem.name        || '',
        nameEn:          editItem.nameEn      || '',
        sku:             editItem.sku         || '',
        barcode:         editItem.barcode     || '',
        price:           editItem.price       ?? '',
        qty:             editItem.qty         ?? '',
        minThreshold:    editItem.minThreshold ?? '',
        type:            editItem.type        || 'unit',
        unitsPerPackage: editItem.unitsPerPackage || 1,
        datasheet:       editItem.datasheet   || '',
        deptId:          editItem.deptId?._id || editItem.deptId || '',
        catId:           editItem.catId?._id  || editItem.catId  || '',
        status:          editItem.status      || 'active',
      });
      setPhotos(editItem.photos || []);
    } else {
      setForm(defaultForm);
      setPhotos([]);
    }
    setTab('info');
    setNewFile(null);
  }, [editItem, open]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price:           parseFloat(form.price)        || 0,
        qty:             parseInt(form.qty)             || 0,
        minThreshold:    parseInt(form.minThreshold)    || 0,
        unitsPerPackage: parseInt(form.unitsPerPackage) || 1,
        deptId:          form.deptId  || undefined,
        catId:           form.catId   || undefined,
      };
      const result = await saveItem(payload, editItem?._id);

      // Upload staged main photo if any
      if (newFile && result?._id) {
        try {
          setUploading(true);
          await api.uploadPhoto(result._id, newFile);
        } catch (e) { console.error('Photo upload failed', e); }
        finally { setUploading(false); }
      }
      onClose();
    } catch {
      // error shown by context toast
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = async (file) => {
    if (!editItem?._id || !file) return;
    setUploading(true);
    try {
      await api.addItemPhoto(editItem._id, file);
      const fresh = await api.getItem(editItem._id);
      setPhotos(fresh.photos || []);
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  const handleDeletePhoto = async (publicId) => {
    if (!editItem?._id) return;
    setDeleting(publicId);
    try {
      await api.deleteItemPhoto(editItem._id, publicId);
      setPhotos(prev => prev.filter(p => p !== publicId && !p.includes(publicId.split('/').pop())));
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const inputCls = "w-full bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editItem ? t.editItem : t.addItem}
      wide
    >
      {/* Tabs */}
      {editItem && (
        <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          {['info', 'photos'].map(tb => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === tb
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tb === 'info' ? (isAR ? 'معلومات الصنف' : 'Item Info') : (isAR ? 'الصور' : 'Photos')}
            </button>
          ))}
        </div>
      )}

      {/* ── Info Tab ─────────────────────────────────────────────────────── */}
      {tab === 'info' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t.name} *</label>
              <input required className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t.nameEn}</label>
              <input className={inputCls} value={form.nameEn} onChange={e => set('nameEn', e.target.value)} />
            </div>
          </div>

          {/* SKU / Barcode / Datasheet */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t.sku}</label>
              <input className={inputCls} value={form.sku} onChange={e => set('sku', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t.barcode}</label>
              <input className={`${inputCls} font-mono`} value={form.barcode} onChange={e => set('barcode', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t.datasheet}</label>
              <input className={inputCls} value={form.datasheet} onChange={e => set('datasheet', e.target.value)} />
            </div>
          </div>

          {/* Price / Qty / Min */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t.price}</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={form.price} onChange={e => set('price', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t.qty}</label>
              <input type="number" min="0" className={inputCls} value={form.qty} onChange={e => set('qty', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t.minThreshold}</label>
              <input type="number" min="0" className={inputCls} value={form.minThreshold} onChange={e => set('minThreshold', e.target.value)} />
            </div>
          </div>

          {/* Type / Units per package */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t.type}</label>
              <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)}>
                {ITEM_TYPES.map(tp => (
                  <option key={tp} value={tp}>{tp.charAt(0).toUpperCase() + tp.slice(1)}</option>
                ))}
              </select>
            </div>
            {form.type !== 'unit' && (
              <div>
                <label className={labelCls}>{t.unitsPerPackage}</label>
                <input type="number" min="1" className={inputCls} value={form.unitsPerPackage} onChange={e => set('unitsPerPackage', e.target.value)} />
              </div>
            )}
          </div>

          {/* Dept / Cat / Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t.department}</label>
              <select className={inputCls} value={form.deptId} onChange={e => set('deptId', e.target.value)}>
                <option value="">— {isAR ? 'بدون' : 'None'} —</option>
                {depts.map(d => (
                  <option key={d._id} value={d._id}>{isAR ? d.name : (d.nameEn || d.name)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.category}</label>
              <select className={inputCls} value={form.catId} onChange={e => set('catId', e.target.value)}>
                <option value="">— {isAR ? 'بدون' : 'None'} —</option>
                {cats.map(c => (
                  <option key={c._id} value={c._id}>{isAR ? c.name : (c.nameEn || c.name)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.status}</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">{t.active}</option>
                <option value="discontinued">{t.discontinued}</option>
              </select>
            </div>
          </div>

          {/* Main photo (new item only) */}
          {!editItem && (
            <div>
              <label className={labelCls}>{isAR ? 'الصورة الرئيسية' : 'Main Photo'}</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setNewFile(e.target.files[0] || null)}
                className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-500/10 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" disabled={saving || uploading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors border border-blue-500 flex items-center gap-2 disabled:opacity-70">
              {(saving || uploading) && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {t.save}
            </button>
          </div>
        </form>
      )}

      {/* ── Photos Tab ────────────────────────────────────────────────────── */}
      {tab === 'photos' && editItem && (
        <div className="space-y-6">
          {/* Upload new photo */}
          <div>
            <label className={labelCls}>{isAR ? 'إضافة صورة' : 'Add Photo'}</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => { if (e.target.files[0]) handleAddPhoto(e.target.files[0]); }}
              className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-500/10 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
              disabled={uploading}
            />
            {uploading && (
              <div className="flex items-center gap-2 mt-2 text-sm text-blue-500">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
                {isAR ? 'جاري الرفع...' : 'Uploading...'}
              </div>
            )}
          </div>

          {/* Gallery */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((url, idx) => {
                const publicId = url.includes('cloudinary') ? url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '') : url;
                return (
                  <div key={url} className="relative group rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 aspect-square">
                    <img src={url} alt={`photo-${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleDeletePhoto(publicId)}
                        disabled={deleting === publicId}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        {deleting === publicId
                          ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : '🗑️'}
                        {isAR ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              {isAR ? 'لا توجد صور بعد' : 'No photos yet'}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
