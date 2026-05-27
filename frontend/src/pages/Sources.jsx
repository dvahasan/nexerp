import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { T, inputStyle } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';

export default function Sources() {
  const { isAR, theme, company, showToast, user } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  
  const defaultForm = { name: '', contact: '', notes: '' };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.getSources();
      setItems(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleOpen = (item = null) => {
    if (user?.isDemo) { showToast(isAR ? 'غير متاح في وضع التجربة' : 'Disabled in Demo Mode', 'error'); return; }
    if (item) {
      setEditItem(item);
      setForm({ ...item });
    } else {
      setEditItem(null);
      setForm(defaultForm);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editItem) await api.updateSource(editItem._id, form);
      else await api.addSource(form);
      setModalOpen(false);
      loadData();
    } catch (e) {
      showToast(e.message || 'Error', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteSource(deleteTarget);
      await loadData();
      setConfirmOpen(false);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally { setDeleting(false); }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: t.fg }}>Sources</h1>
          <p style={{ color: t.fgMuted, margin: '4px 0 0', fontSize: 14 }}>Manage suppliers, vendors, and inbound sources</p>
        </div>
        <button onClick={() => handleOpen()} style={{
          display: 'flex', alignItems: 'center', gap: 8, backgroundColor: primary, color: '#fff',
          padding: '8px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 600
        }}>
          <Icon name="add" size={18} /> Add Source
        </button>
      </div>

      <div style={{ backgroundColor: t.canvas, borderRadius: 4, border: `1px solid ${t.border}`, overflow: 'auto' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div> : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: t.fgMuted }}>No sources found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isAR ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: t.sunken }}>
                <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>Name</th>
                <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>Contact</th>
                <th style={{ padding: 12, color: t.fgMuted, fontSize: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(d => (
                <tr key={d._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td style={{ padding: 12, color: t.fg, fontWeight: 500 }}>{d.name}</td>
                  <td style={{ padding: 12, color: t.fgSubtle }}>{d.contact || '-'}</td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleOpen(d)} style={{ background: 'none', border: 'none', color: t.fgSubtle, cursor: 'pointer' }}><Icon name="edit" size={16} /></button>
                      <button onClick={() => { setDeleteTarget(d._id); setConfirmOpen(true); }} style={{ background: 'none', border: 'none', color: t.neg, cursor: 'pointer' }}><Icon name="delete" size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Source' : 'Add Source'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: t.fgSubtle }}>Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle(theme)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: t.fgSubtle }}>Contact Info</label>
            <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} style={inputStyle(theme)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: t.fgSubtle }}>Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle(theme)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: t.fgMuted, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={!form.name || saving} style={{ backgroundColor: primary, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px' }}>Save</button>
          </div>
        </div>
      </Modal>

      <Confirm open={confirmOpen} title="Delete Source" msg="Are you sure you want to delete this?" onCancel={() => setConfirmOpen(false)} onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
