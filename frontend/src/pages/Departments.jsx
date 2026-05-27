import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { T, inputStyle } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';

export default function Departments() {
  const { t: tr, isAR, theme, company, depts, loadData, user, showToast } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [modalOpen, setModalOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({ name: '', nameEn: '', color: '#3b82f6' });
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpen = (dept = null) => {
    if (dept) {
      if (user?.isDemo) { showToast(isAR ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error'); return; }
      setEditDept(dept);
      setForm({ name: dept.name, nameEn: dept.nameEn || '', color: dept.color || '#3b82f6' });
    } else {
      if (user?.isDemo) { showToast(isAR ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error'); return; }
      setEditDept(null);
      setForm({ name: '', nameEn: '', color: '#3b82f6' });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editDept) {
        await api.updateDept(editDept._id, form);
      } else {
        await api.addDept(form);
      }
      setModalOpen(false);   // close immediately — don't wait for reload
      loadData();            // refresh in background
    } catch (e) {
      console.error(e);
      showToast(e.message || (isAR ? 'حدث خطأ' : 'An error occurred'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (user?.isDemo) {
      showToast(isAR ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error');
      setConfirmOpen(false);
      return;
    }
    setDeleting(true);
    try {
      await api.deleteDept(deleteTarget);
      await loadData();
      setConfirmOpen(false);
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="tour-departments-page" style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: t.fg }}>
            {isAR ? 'الأقسام' : 'Departments'}
          </h1>
          <p style={{ color: t.fgMuted, margin: '4px 0 0', fontSize: 14 }}>
            {isAR ? 'إدارة أقسام الشركة' : 'Manage company departments'}
          </p>
        </div>
        <button onClick={() => handleOpen()} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          backgroundColor: primary, color: '#fff',
          padding: '8px 16px', borderRadius: 4, border: 'none',
          fontSize: 14, fontWeight: 600, cursor: 'pointer'
        }}>
          <Icon name="add" size={18} />
          {isAR ? 'إضافة قسم' : 'Add Department'}
        </button>
      </div>

      <div style={{
        backgroundColor: t.canvas, borderRadius: 4, border: `1px solid ${t.border}`, overflow: 'auto', maxHeight: 'calc(100vh - 220px)'
      }}>
        {depts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: t.fgMuted }}>
            {isAR ? 'لا توجد أقسام حالياً' : 'No departments found'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isAR ? 'right' : 'left', minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: `${t.fg}06` }}>
                <th style={{ padding: '12px 16px', color: t.fgMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 10, backgroundColor: t.sunken }}>{isAR ? 'اللون' : 'Color'}</th>
                <th style={{ padding: '12px 16px', color: t.fgMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 10, backgroundColor: t.sunken }}>{isAR ? tr.name : tr.nameEn}</th>
                <th style={{ padding: '12px 16px', color: t.fgMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 10, backgroundColor: t.sunken }}>{isAR ? 'الاسم الإنجليزي' : 'Arabic Name'}</th>
                <th style={{ padding: '12px 16px', color: t.fgMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', width: 100, position: 'sticky', top: 0, zIndex: 10, backgroundColor: t.sunken }}>{isAR ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {depts.map(d => (
                <tr key={d._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: d.color || primary }} />
                  </td>
                  <td style={{ padding: '12px 16px', color: t.fg, fontWeight: 500 }}>{isAR ? d.name : (d.nameEn || d.name)}</td>
                  <td style={{ padding: '12px 16px', color: t.fgSubtle }}>{isAR ? (d.nameEn || '-') : d.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleOpen(d)} style={{
                        background: 'none', border: 'none', color: t.fgSubtle, cursor: 'pointer', padding: 4
                      }}>
                        <Icon name="edit" size={16} />
                      </button>
                      <button onClick={() => { setDeleteTarget(d._id); setConfirmOpen(true); }} style={{
                        background: 'none', border: 'none', color: t.neg, cursor: 'pointer', padding: 4
                      }}>
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editDept ? (isAR ? 'تعديل قسم' : 'Edit Department') : (isAR ? 'إضافة قسم' : 'Add Department')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: t.fgSubtle }}>
              {isAR ? 'اسم القسم (عربي)' : 'Department Name (Arabic)'}
            </label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              style={inputStyle(theme)} placeholder={isAR ? 'أدخل اسم القسم' : 'Enter name'} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: t.fgSubtle }}>
              {isAR ? 'اسم القسم (إنجليزي)' : 'Department Name (English)'}
            </label>
            <input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })}
              style={inputStyle(theme)} placeholder={isAR ? 'Enter English name' : 'Enter English name'} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: t.fgSubtle }}>
              {isAR ? 'لون القسم' : 'Department Color'}
            </label>
            <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
              style={{ width: 40, height: 40, border: 'none', padding: 0, background: 'none', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button onClick={() => setModalOpen(false)} style={{
              background: 'transparent', border: 'none', color: t.fgMuted, cursor: 'pointer', fontWeight: 600, padding: '8px 16px'
            }}>
              {tr.cancel}
            </button>
            <button onClick={handleSave} disabled={!form.name || saving} style={{
              backgroundColor: primary, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px',
              fontWeight: 600, cursor: (!form.name || saving) ? 'not-allowed' : 'pointer', opacity: (!form.name || saving) ? 0.6 : 1
            }}>
              {saving ? '...' : tr.save}
            </button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={confirmOpen}
        title={isAR ? 'حذف القسم' : 'Delete Department'}
        msg={isAR ? 'هل أنت متأكد من حذف هذا القسم؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this department? This cannot be undone.'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
