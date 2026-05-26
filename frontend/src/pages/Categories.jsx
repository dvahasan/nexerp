import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { T, inputStyle } from '../theme';
import { api } from '../api';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';

export default function Categories() {
  const { t: tr, isAR, theme, company, depts, cats, loadData, user, showToast } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [form, setForm] = useState({ name: '', nameEn: '', deptId: '', parentId: '' });
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filter out the category itself and its descendants so we don't allow recursive loops
  const getAvailableParents = (deptId, excludeId) => {
    let available = cats.filter(c => {
      const cDeptId = typeof c.deptId === 'object' ? c.deptId?._id : c.deptId;
      return cDeptId === deptId;
    });
    if (excludeId) {
      available = available.filter(c => c._id !== excludeId && !(c.path && c.path.includes(`,${excludeId},`)));
    }
    
    // Build tree purely for indentation/display
    const buildTree = (parentId, depth = 0) => {
      let res = [];
      const children = available.filter(c => (c.parentId || null) === parentId);
      for (const child of children) {
        res.push({ ...child, depth });
        res = res.concat(buildTree(child._id, depth + 1));
      }
      return res;
    };
    return buildTree(null);
  };

  const handleOpen = (cat = null) => {
    if (cat) {
      if (user?.isDemo) { showToast(isAR ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error'); return; }
      setEditCat(cat);
      const cDeptId = typeof cat.deptId === 'object' ? cat.deptId?._id : cat.deptId;
      setForm({ name: cat.name, nameEn: cat.nameEn || '', deptId: cDeptId || '', parentId: cat.parentId || '' });
    } else {
      if (user?.isDemo) { showToast(isAR ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error'); return; }
      setEditCat(null);
      setForm({ name: '', nameEn: '', deptId: depts[0]?._id || '', parentId: '' });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.deptId) return;
    setSaving(true);
    try {
      if (editCat) {
        await api.updateCat(editCat._id, form);
      } else {
        await api.addCat(form);
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
      await api.deleteCat(deleteTarget);
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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: t.fg }}>
            {isAR ? 'التصنيفات' : 'Categories'}
          </h1>
          <p style={{ color: t.fgMuted, margin: '4px 0 0', fontSize: 14 }}>
            {isAR ? 'إدارة تصنيفات الأصناف الهرمية' : 'Manage hierarchical item categories'}
          </p>
        </div>
        <button onClick={() => handleOpen()} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          backgroundColor: primary, color: '#fff',
          padding: '8px 16px', borderRadius: 4, border: 'none',
          fontSize: 14, fontWeight: 600, cursor: 'pointer'
        }}>
          <Icon name="add" size={18} />
          {isAR ? 'إضافة تصنيف' : 'Add Category'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {depts.map(dept => {
          const deptCats = cats.filter(c => {
            const cDeptId = typeof c.deptId === 'object' ? c.deptId?._id : c.deptId;
            return cDeptId === dept._id;
          });
          if (deptCats.length === 0) return null;
          
          const buildTreeList = (parentId, depth = 0) => {
              let res = [];
              const children = deptCats.filter(c => (c.parentId || null) === parentId);
              for (const child of children) {
                res.push({ ...child, depth });
                res = res.concat(buildTreeList(child._id, depth + 1));
              }
              return res;
          };
          const tree = buildTreeList(null);

          return (
            <div key={dept._id} style={{
              backgroundColor: t.canvas, borderRadius: 4, border: `1px solid ${t.border}`, overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: `${dept.color || primary}15`, padding: '12px 16px',
                borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10
              }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: dept.color || primary }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.fg }}>{isAR ? dept.name : (dept.nameEn || dept.name)}</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isAR ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: `${t.fg}06` }}>
                    <th style={{ padding: '12px 16px', color: t.fgMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{isAR ? tr.name : tr.nameEn}</th>
                    <th style={{ padding: '12px 16px', color: t.fgMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{isAR ? 'الاسم الإنجليزي' : 'Arabic Name'}</th>
                    <th style={{ padding: '12px 16px', color: t.fgMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', width: 100 }}>{isAR ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {tree.map(c => (
                    <tr key={c._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '12px 16px', color: t.fg, fontWeight: c.depth === 0 ? 600 : 500 }}>
                        <span style={{ display: 'inline-block', width: c.depth * 24 }}></span>
                        {c.depth > 0 && <span style={{ color: t.fgMuted, marginRight: 8, marginLeft: 8 }}>↳</span>}
                        {isAR ? c.name : (c.nameEn || c.name)}
                      </td>
                      <td style={{ padding: '12px 16px', color: t.fgSubtle }}>{isAR ? (c.nameEn || '-') : c.name}</td>
                      <td style={{ padding: '12px 16px', width: 100 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleOpen(c)} style={{
                            background: 'none', border: 'none', color: t.fgSubtle, cursor: 'pointer', padding: 4
                          }}>
                            <Icon name="edit" size={16} />
                          </button>
                          <button onClick={() => { setDeleteTarget(c._id); setConfirmOpen(true); }} style={{
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
              </div>
            </div>
          );
        })}
        
        {cats.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: t.fgMuted, backgroundColor: t.canvas, borderRadius: 4, border: `1px solid ${t.border}` }}>
            {isAR ? 'لا توجد تصنيفات حالياً' : 'No categories found'}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editCat ? (isAR ? 'تعديل تصنيف' : 'Edit Category') : (isAR ? 'إضافة تصنيف' : 'Add Category')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: t.fgSubtle }}>
              {isAR ? 'القسم' : 'Department'}
            </label>
            <select value={form.deptId} onChange={e => setForm({ ...form, deptId: e.target.value, parentId: '' })}
              style={{ ...inputStyle(theme), width: '100%' }}>
              <option value="">{isAR ? 'اختر القسم' : 'Select Department'}</option>
              {depts.map(d => <option key={d._id} value={d._id}>{isAR ? d.name : (d.nameEn || d.name)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: t.fgSubtle }}>
              {isAR ? 'التصنيف الأب' : 'Parent Category'}
            </label>
            <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}
              disabled={!form.deptId} style={{ ...inputStyle(theme), width: '100%' }}>
              <option value="">{isAR ? 'رئيسي (بدون أب)' : 'Root (No Parent)'}</option>
              {getAvailableParents(form.deptId, editCat?._id).map(c => (
                 <option key={c._id} value={c._id}>
                   {"\u00A0\u00A0\u00A0\u00A0".repeat(c.depth)}{c.depth > 0 ? '↳ ' : ''}{isAR ? c.name : (c.nameEn || c.name)}
                 </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: t.fgSubtle }}>
              {isAR ? 'اسم التصنيف (عربي)' : 'Category Name (Arabic)'}
            </label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              style={inputStyle(theme)} placeholder={isAR ? 'أدخل اسم التصنيف' : 'Enter name'} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: t.fgSubtle }}>
              {isAR ? 'اسم التصنيف (إنجليزي)' : 'Category Name (English)'}
            </label>
            <input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })}
              style={inputStyle(theme)} placeholder={isAR ? 'Enter English name' : 'Enter English name'} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button onClick={() => setModalOpen(false)} style={{
              background: 'transparent', border: 'none', color: t.fgMuted, cursor: 'pointer', fontWeight: 600, padding: '8px 16px'
            }}>
              {tr.cancel}
            </button>
            <button onClick={handleSave} disabled={!form.name || !form.deptId || saving} style={{
              backgroundColor: primary, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px',
              fontWeight: 600, cursor: (!form.name || !form.deptId || saving) ? 'not-allowed' : 'pointer', opacity: (!form.name || !form.deptId || saving) ? 0.6 : 1
            }}>
              {saving ? '...' : tr.save}
            </button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={confirmOpen}
        title={isAR ? 'حذف التصنيف' : 'Delete Category'}
        msg={isAR ? 'هل أنت متأكد من حذف هذا التصنيف؟' : 'Are you sure you want to delete this category?'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
