import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const AppContext = createContext();

// ─── Translations ──────────────────────────────────────────────────────────
const T = {
  en: {
    login: "Login", companyCode: "Company Code", username: "Username",
    password: "Password", dashboard: "Dashboard", inventory: "Inventory",
    transactions: "Transactions", settings: "Settings", logout: "Logout",
    users: "Users", addItem: "Add Item", editItem: "Edit Item",
    deleteItem: "Delete Item", addTransaction: "Record Transaction",
    editTransaction: "Edit Transaction", deleteTransaction: "Delete Transaction",
    addUser: "Add User", editUser: "Edit User", deleteUser: "Delete User",
    save: "Save", cancel: "Cancel", confirm: "Confirm", delete: "Delete",
    edit: "Edit", name: "Name (Arabic)", nameEn: "Name (English)",
    sku: "SKU / Code", barcode: "Barcode", price: "Price", qty: "Quantity",
    minThreshold: "Min Threshold", type: "Type", department: "Department",
    category: "Category", status: "Status", active: "Active",
    discontinued: "Discontinued", unitsPerPackage: "Units Per Package",
    datasheet: "Datasheet / Permit #", notes: "Notes", source: "Source",
    destination: "Destination", date: "Date", role: "Role", email: "Email",
    phone: "Phone", permissions: "Permissions", canAdd: "Can Add Items",
    canEdit: "Can Edit Items", canDelete: "Can Delete Items",
    canTx: "Can Record Transactions", canManageUsers: "Can Manage Users",
    deleteConfirmTitle: "Confirm Delete",
    deleteConfirmMsg: "Are you sure you want to delete this? This action cannot be undone.",
    iconPack: "Icon Pack", theme: "Theme",
    companySettings: "Company Settings (Admin)",
    personalSettings: "Personal Settings", language: "Interface Language",
    baseCurrency: "Base Currency", primaryColor: "Primary Color",
    cloudStorage: "Cloud Storage", search: "Search",
  },
  ar: {
    login: "تسجيل الدخول", companyCode: "رمز الشركة", username: "اسم المستخدم",
    password: "كلمة المرور", dashboard: "لوحة القيادة", inventory: "المخزون",
    transactions: "المعاملات", settings: "الإعدادات", logout: "تسجيل الخروج",
    users: "المستخدمين", addItem: "إضافة صنف", editItem: "تعديل الصنف",
    deleteItem: "حذف الصنف", addTransaction: "تسجيل حركة",
    editTransaction: "تعديل الحركة", deleteTransaction: "حذف الحركة",
    addUser: "إضافة مستخدم", editUser: "تعديل المستخدم", deleteUser: "حذف المستخدم",
    save: "حفظ", cancel: "إلغاء", confirm: "تأكيد", delete: "حذف",
    edit: "تعديل", name: "الاسم (عربي)", nameEn: "الاسم (إنجليزي)",
    sku: "كود الصنف", barcode: "الباركود", price: "السعر", qty: "الكمية",
    minThreshold: "الحد الأدنى", type: "النوع", department: "القسم",
    category: "الفئة", status: "الحالة", active: "نشط", discontinued: "متوقف",
    unitsPerPackage: "الوحدات لكل طرد", datasheet: "رقم الإذن/الداتاشيت",
    notes: "ملاحظات", source: "المصدر", destination: "الوجهة",
    date: "التاريخ", role: "الدور", email: "البريد الإلكتروني", phone: "الهاتف",
    permissions: "الصلاحيات", canAdd: "إضافة أصناف", canEdit: "تعديل أصناف",
    canDelete: "حذف أصناف", canTx: "تسجيل الحركات",
    canManageUsers: "إدارة المستخدمين",
    deleteConfirmTitle: "تأكيد الحذف",
    deleteConfirmMsg: "هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.",
    iconPack: "مجموعة الأيقونات", theme: "المظهر",
    companySettings: "إعدادات الشركة (للمدراء)",
    personalSettings: "الإعدادات الشخصية", language: "لغة الواجهة",
    baseCurrency: "العملة الافتراضية", primaryColor: "اللون الأساسي",
    cloudStorage: "التخزين السحابي", search: "بحث",
  },
};

// ─── Currency list ──────────────────────────────────────────────────────────
export const CURRENCIES = [
  { code: 'USD', symbol: '$',   name: 'US Dollar' },
  { code: 'EUR', symbol: '€',   name: 'Euro' },
  { code: 'EGP', symbol: 'E£',  name: 'Egyptian Pound' },
  { code: 'SAR', symbol: '﷼',  name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'GBP', symbol: '£',   name: 'British Pound' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  { code: 'BHD', symbol: 'BD',  name: 'Bahraini Dinar' },
  { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial' },
  { code: 'JOD', symbol: 'JD',  name: 'Jordanian Dinar' },
  { code: 'TRY', symbol: '₺',   name: 'Turkish Lira' },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan' },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen' },
];

export const getCurrencySymbol = (code) =>
  CURRENCIES.find(c => c.code === code)?.symbol || code;

// ──────────────────────────────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [company, setCompany] = useState(null);
  const [authed,  setAuthed]  = useState(false);
  const [loading, setLoading] = useState(true);

  const [lang,  setLang]  = useState(() => localStorage.getItem('nexerp_lang')  || 'en');
  const [theme, setTheme] = useState(() => localStorage.getItem('nexerp_theme') || 'dark');

  const [items, setItems] = useState([]);
  const [depts, setDepts] = useState([]);
  const [cats,  setCats]  = useState([]);
  const [users, setUsers] = useState([]);
  const [txs,   setTxs]   = useState([]);
  const [stats, setStats] = useState(null);

  // ── Toast system ──────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Theme / lang effects ─────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('nexerp_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('nexerp_theme', theme);
  }, [theme]);

  // ── Auth ─────────────────────────────────────────────────────────────────
  const checkAuth = async () => {
    try {
      const data = await api.me();
      setUser({ ...data.user, perms: data.perms });
      setCompany(data.company);
      setAuthed(true);
      if (data.user.preferredLanguage) setLang(data.user.preferredLanguage);
      if (data.company?.theme) setTheme(data.company.theme);
    } catch {
      setAuthed(false);
      setUser(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('nexerp_token')) checkAuth();
    else setLoading(false);
  }, []);

  const login = async (code, username, password) => {
    const data = await api.login(code, username, password);
    localStorage.setItem('nexerp_token', data.token);
    setUser({ ...data.user, perms: data.perms });
    setCompany(data.company);
    setAuthed(true);
    if (data.user.preferredLanguage) setLang(data.user.preferredLanguage);
    if (data.company?.theme) setTheme(data.company.theme);
  };

  // Called after registration — token already issued, just load the session
  const loginWithToken = async (token) => {
    localStorage.setItem('nexerp_token', token);
    await checkAuth();
  };

  const logout = () => {
    localStorage.removeItem('nexerp_token');
    setAuthed(false);
    setUser(null);
    setCompany(null);
    setItems([]); setDepts([]); setCats([]); setUsers([]); setTxs([]); setStats(null);
  };

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!authed) return;
    try {
      const [i, d, c, u, tData, s] = await Promise.all([
        api.getItems(),
        api.getDepts(),
        api.getCats(),
        user?.perms?.canManageUsers ? api.getUsers() : Promise.resolve([]),
        api.getTxs(),
        api.getStats(),
      ]);
      setItems(i); setDepts(d); setCats(c);
      setUsers(u); setTxs(tData); setStats(s);
    } catch (e) {
      console.error('Failed to load data', e);
    }
  }, [authed, user?.perms?.canManageUsers]);

  useEffect(() => { loadData(); }, [authed]);

  // ── CRUD — Items ──────────────────────────────────────────────────────────
  const saveItem = async (data, id = null) => {
    try {
      const result = id ? await api.updateItem(id, data) : await api.addItem(data);
      await loadData();
      showToast(id ? (lang === 'ar' ? 'تم تعديل الصنف' : 'Item updated') : (lang === 'ar' ? 'تمت إضافة الصنف' : 'Item added'));
      return result;
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  const removeItem = async (id) => {
    try {
      await api.deleteItem(id);
      setItems(prev => prev.filter(i => i._id !== id));
      showToast(lang === 'ar' ? 'تم حذف الصنف' : 'Item deleted');
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  // ── CRUD — Transactions ───────────────────────────────────────────────────
  const saveTx = async (data, id = null) => {
    try {
      const result = id ? await api.updateTx(id, data) : await api.addTx(data);
      await loadData();
      showToast(id ? (lang === 'ar' ? 'تم تعديل الحركة' : 'Transaction updated') : (lang === 'ar' ? 'تم تسجيل الحركة' : 'Transaction recorded'));
      return result;
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  const removeTx = async (id) => {
    try {
      await api.deleteTx(id);
      await loadData();
      showToast(lang === 'ar' ? 'تم حذف الحركة' : 'Transaction deleted');
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  // ── CRUD — Users ──────────────────────────────────────────────────────────
  const saveUser = async (data, id = null) => {
    try {
      const result = id ? await api.updateUser(id, data) : await api.addUser(data);
      const fresh = await api.getUsers();
      setUsers(fresh);
      showToast(id ? (lang === 'ar' ? 'تم تعديل المستخدم' : 'User updated') : (lang === 'ar' ? 'تمت إضافة المستخدم' : 'User added'));
      return result;
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  const removeUser = async (id) => {
    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u._id !== id));
      showToast(lang === 'ar' ? 'تم حذف المستخدم' : 'User deleted');
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  // ── Company update ────────────────────────────────────────────────────────
  const doUpdateCompany = async (data) => {
    try {
      await api.updateCompany(data);
      setCompany(prev => ({ ...prev, ...data }));
      showToast(lang === 'ar' ? 'تم حفظ إعدادات الشركة' : 'Company settings saved');
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  // ── Expose ────────────────────────────────────────────────────────────────
  const value = {
    user, company, authed, loading,
    lang, setLang, theme, setTheme,
    items, depts, cats, users, txs, stats,
    login, loginWithToken, logout, loadData,
    toasts, showToast, removeToast,
    saveItem, removeItem,
    saveTx, removeTx,
    saveUser, removeUser,
    doUpdateCompany,
    t: T[lang] || T.en,
    isAR: lang === 'ar',
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
