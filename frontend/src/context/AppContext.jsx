import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { api, setDemoMode, getDemoMode } from '../api';

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
    canTxIn: "Can Record Stock In", canTxOut: "Can Record Stock Out",
    canTx: "Can Record Transactions", canManageUsers: "Can Manage Users",
    stockIn: "Stock In", stockOut: "Stock Out",
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
    canDelete: "حذف أصناف", canTxIn: "تسجيل وارد", canTxOut: "تسجيل صادر",
    canTx: "تسجيل الحركات", canManageUsers: "إدارة المستخدمين",
    stockIn: "وارد (IN)", stockOut: "صادر (OUT)",
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

  const [lang,  setLang]  = useState(() => localStorage.getItem('nexinv_lang')  || 'en');
  const [theme, setTheme] = useState(() => localStorage.getItem('nexinv_theme') || 'dark');

  const [items,      setItems]      = useState([]);
  const [depts,      setDepts]      = useState([]);
  const [cats,       setCats]       = useState([]);
  const [users,      setUsers]      = useState([]);
  const [stats,      setStats]      = useState(null);
  const [warehouses, setWarehouses] = useState([]);

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
    localStorage.setItem('nexinv_lang', lang);
  }, [lang]);



  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('nexinv_theme', theme);
  }, [theme]);

  // ── Dynamic Theme Override ────────────────────────────────────────────────
  useEffect(() => {
    if (company?.primaryColor) {
      let style = document.getElementById('dynamic-theme');
      if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-theme';
        document.head.appendChild(style);
      }
      const c = company.primaryColor;
      
      // Calculate contrast text color based on primary brightness
      const getBrightness = (hex) => {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return ((r * 299) + (g * 587) + (b * 114)) / 1000;
      };
      const isLight = getBrightness(c) > 128;
      const textC = isLight ? '#0f172a' : '#ffffff'; // slate-900 or white

      // Overriding standard Tailwind blue utilities used across the app
      style.innerHTML = `
        :root { 
          --primary: ${c}; 
          --primary-text: ${textC};
        }
        .bg-blue-500, .bg-blue-600 { background-color: var(--primary) !important; color: var(--primary-text) !important; }
        .bg-blue-500 .text-white, .bg-blue-600 .text-white, .from-blue-500 .text-white, .from-blue-600 .text-white { color: var(--primary-text) !important; }
        .bg-blue-500 .text-blue-200, .bg-blue-600 .text-blue-200, .from-blue-500 .text-blue-200, .from-blue-600 .text-blue-200 { color: var(--primary-text) !important; opacity: 0.8; }
        .text-blue-500, .text-blue-600 { color: var(--primary) !important; }
        .border-blue-500, .border-blue-600 { border-color: var(--primary) !important; }
        .ring-blue-500, .ring-blue-600 { --tw-ring-color: var(--primary) !important; }
        .from-blue-500, .from-blue-600 { --tw-gradient-from: var(--primary) var(--tw-gradient-from-position) !important; }
        .to-indigo-500, .to-indigo-600 { --tw-gradient-to: var(--primary) var(--tw-gradient-to-position) !important; }
        .hover\\:bg-blue-500:hover, .hover\\:bg-blue-600:hover { background-color: var(--primary) !important; color: var(--primary-text) !important; filter: brightness(0.9); }
        .hover\\:text-blue-500:hover, .hover\\:text-blue-600:hover { color: var(--primary) !important; filter: brightness(0.9); }
      `;
    }
  }, [company?.primaryColor]);

  // ── Auth ─────────────────────────────────────────────────────────────────
  const checkAuth = async () => {
    try {
      const data = await api.me();
      const isDemo = getDemoMode();
      setUser({ ...data.user, perms: data.perms, isDemo });
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
    if (localStorage.getItem('nexinv_token') || getDemoMode()) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (code, username, password) => {
    const data = await api.login(code, username, password);
    localStorage.setItem('nexinv_token', data.token);
    setDemoMode(null);
    setUser({ ...data.user, perms: data.perms, isDemo: false });
    setCompany(data.company);
    setAuthed(true);
    if (data.user.preferredLanguage) setLang(data.user.preferredLanguage);
    if (data.company?.theme) setTheme(data.company.theme);
    // Navigation handled by the calling component (Login.jsx)
  };

  const loginDemo = async (type) => {
    // Completely bypass backend for demo login and use ephemeral memory state
    setDemoMode(type);
    // Since isDemo is true, checkAuth will hit our mock /auth/me via api.js
    await checkAuth();
  };

  // Called after registration — token already issued, just load the session
  const loginWithToken = async (token) => {
    localStorage.setItem('nexinv_token', token);
    await checkAuth();
    // Navigation handled by the calling component (Register.jsx)
  };

  const logout = () => {
    localStorage.removeItem('nexinv_token');
    setDemoMode(null);
    setAuthed(false);
    setUser(null);
    setCompany(null);
    setItems([]); setDepts([]); setCats([]); setUsers([]); setStats(null); setWarehouses([]);
    // Navigation handled by Layout.jsx logout button
  };

  const [lastSync, setLastSync] = useState(null);
  const [liveTx, setLiveTx] = useState(null);
  const [liveItem, setLiveItem] = useState(null);
  const [syncing,  setSyncing]  = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    const onStart = () => setIsTourActive(true);
    const onStop = () => setIsTourActive(false);
    window.addEventListener('tourStarted', onStart);
    window.addEventListener('tourStopped', onStop);
    return () => {
      window.removeEventListener('tourStarted', onStart);
      window.removeEventListener('tourStopped', onStop);
    };
  }, []);

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!authed) return;
    if (!silent) return;
    setSyncing(true);
    try {
      const [iData, d, c, u, s, wh] = await Promise.all([
        api.getItems(),
        api.getDepts(),
        api.getCats(),
        user?.perms?.canManageUsers ? api.getUsers() : Promise.resolve(users),
        api.getStats(),
        api.getWarehouses().catch(() => []),
      ]);
      setItems(Array.isArray(iData) ? iData : (iData.items || []));
      setDepts(d); setCats(c); setUsers(u); setStats(s);
      setWarehouses(Array.isArray(wh) ? wh : []);
      setLastSync(new Date());
    } catch (e) {
      console.error('Live sync failed', e);
    } finally {
      setSyncing(false);
    }
  }, [authed, user?.perms?.canManageUsers]);

  // Full reload (used after CRUD operations — always fetches everything)
  const reloadData = useCallback(async () => {
    if (!authed) return;
    try {
      const [iData, d, c, u, s, wh] = await Promise.all([
        api.getItems(),
        api.getDepts(),
        api.getCats(),
        user?.perms?.canManageUsers ? api.getUsers() : Promise.resolve(users),
        api.getStats(),
        api.getWarehouses().catch(() => []),
      ]);
      // getItems returns plain array (all=1 flag)
      setItems(Array.isArray(iData) ? iData : (iData.items || []));
      setDepts(d); setCats(c); setUsers(u); setStats(s);
      setWarehouses(Array.isArray(wh) ? wh : []);
      setLastSync(new Date());
    } catch (e) {
      console.error('Failed to reload data', e);
    }
  }, [authed, user?.perms?.canManageUsers]);

  useEffect(() => { if (authed) reloadData();  }, [authed]);

  const socketRef = useRef(null);
  const [socketStatus, setSocketStatus] = useState('offline');

  useEffect(() => {
    if (authed && (company?.liveSync ?? true) && !user?.isDemo && !isTourActive) {
      setSocketStatus('connecting');
      const token = localStorage.getItem('nexinv_token');
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const socket = io(url, { auth: { token } });
      socketRef.current = socket;
      
      socket.on('connect', () => setSocketStatus('online'));
      socket.on('disconnect', () => setSocketStatus('offline'));

      // Granular patchers
      socket.on('item_added', (newItem) => {
        setItems(prev => [newItem, ...prev]);
        api.getStats().then(setStats).catch(()=>{});
        setLiveItem({ type: 'add', item: newItem });
      });
      socket.on('item_updated', (updatedItem) => {
        setItems(prev => prev.map(i => i._id === updatedItem._id ? updatedItem : i));
        setLiveItem({ type: 'update', item: updatedItem });
      });
      socket.on('item_deleted', ({ _id }) => {
        setItems(prev => prev.filter(i => i._id !== _id));
        api.getStats().then(setStats).catch(()=>{});
        setLiveItem({ type: 'delete', itemId: _id });
      });

      socket.on('user_added', (u) => {
        setUsers(p => [...p, u]);
        setLiveTx({ type: 'refresh_users', ts: Date.now() });
      });
      socket.on('user_updated', (u) => {
        setUsers(p => p.map(x => x._id === u._id ? u : x));
        setLiveTx({ type: 'refresh_users', ts: Date.now() });
      });
      socket.on('user_deleted', ({ _id }) => {
        setUsers(p => p.filter(u => u._id !== _id));
        setLiveTx({ type: 'refresh_users', ts: Date.now() });
      });

      socket.on('refresh_sources', () => setLiveTx({ type: 'refresh_sources', ts: Date.now() }));
      socket.on('refresh_destinations', () => setLiveTx({ type: 'refresh_destinations', ts: Date.now() }));
      socket.on('refresh_projects', () => setLiveTx({ type: 'refresh_projects', ts: Date.now() }));
      socket.on('refresh_reasons', () => setLiveTx({ type: 'refresh_reasons', ts: Date.now() }));
      socket.on('refresh_boms', () => setLiveTx({ type: 'refresh_boms', ts: Date.now() }));
      socket.on('refresh_warehouses', () => {
        api.getWarehouses().then(wh => setWarehouses(Array.isArray(wh) ? wh : [])).catch(()=>{});
        setLiveTx({ type: 'refresh_warehouses', ts: Date.now() });
      });

      socket.on('tx_added', (tx) => {
        api.getStats().then(setStats).catch(()=>{});
        setLastSync(new Date());
        setLiveTx({ type: 'add', tx });
      });
      socket.on('tx_updated', (tx) => {
        api.getStats().then(setStats).catch(()=>{});
        setLastSync(new Date());
        setLiveTx({ type: 'update', tx });
      });
      socket.on('tx_deleted', (txId) => {
        api.getStats().then(setStats).catch(()=>{});
        setLastSync(new Date());
        setLiveTx({ type: 'delete', txId });
      });

      // For less frequent events, just reload specific data
      const reloadDeptsCats = () => {
        api.getDepts().then(setDepts).catch(()=>{});
        api.getCats().then(setCats).catch(()=>{});
      };
      
      ['dept_added', 'dept_updated', 'dept_deleted', 'cat_added', 'cat_updated', 'cat_deleted'].forEach(e => socket.on(e, reloadDeptsCats));

      if (user?.perms?.canManageUsers) {
        const reloadUsers = () => api.getUsers().then(setUsers).catch(()=>{});
        ['user_added', 'user_updated', 'user_deleted'].forEach(e => socket.on(e, reloadUsers));
      }

      return () => {
        socket.disconnect();
      };
    } else {
      setSocketStatus('offline');
    }
  }, [authed, company?.liveSync, user?.perms?.canManageUsers, user?.isDemo, isTourActive]);

  // ── Live polling — fallback refresh every 30 s if socket is offline ───────
  useEffect(() => {
    if (!authed || !(company?.fastRefresh ?? true) || socketStatus === 'online' || isTourActive) return;
    const id = setInterval(() => loadData(true), 30_000);
    return () => clearInterval(id);
  }, [authed, loadData, company?.fastRefresh, socketStatus, isTourActive]);

  // ── CRUD — Items ──────────────────────────────────────────────────────────
  const saveItem = async (data, id = null) => {
    if (user?.isDemo) {
      showToast(lang === 'ar' ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error');
      throw new Error('Demo Mode');
    }
    try {
      const result = id ? await api.updateItem(id, data) : await api.addItem(data);
      await reloadData();
      showToast(id ? (lang === 'ar' ? 'تم تعديل الصنف' : 'Item updated') : (lang === 'ar' ? 'تمت إضافة الصنف' : 'Item added'));
      return result;
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  const removeItem = async (id) => {
    if (user?.isDemo) {
      showToast(lang === 'ar' ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error');
      throw new Error('Demo Mode');
    }
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
    if (user?.isDemo) {
      showToast(lang === 'ar' ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error');
      throw new Error('Demo Mode');
    }
    try {
      const result = id ? await api.updateTx(id, data) : await api.addTx(data);
      // Reload items/stats so stock levels update; transactions are managed by the page itself
      const [iData, s] = await Promise.all([api.getItems(), api.getStats()]);
      setItems(Array.isArray(iData) ? iData : (iData.items || []));
      setStats(s);
      showToast(id ? (lang === 'ar' ? 'تم تعديل الحركة' : 'Transaction updated') : (lang === 'ar' ? 'تم تسجيل الحركة' : 'Transaction recorded'));
      return result;
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  const removeTx = async (id) => {
    if (user?.isDemo) {
      showToast(lang === 'ar' ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error');
      throw new Error('Demo Mode');
    }
    try {
      await api.deleteTx(id);
      const [iData, s] = await Promise.all([api.getItems(), api.getStats()]);
      setItems(Array.isArray(iData) ? iData : (iData.items || []));
      setStats(s);
      showToast(lang === 'ar' ? 'تم حذف الحركة' : 'Transaction deleted');
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  // ── CRUD — Users ──────────────────────────────────────────────────────────
  const saveUser = async (data, id = null, { silent = false } = {}) => {
    if (user?.isDemo) {
      showToast(lang === 'ar' ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error');
      throw new Error('Demo Mode');
    }
    try {
      const result = id ? await api.updateUser(id, data) : await api.addUser(data);
      const fresh = await api.getUsers();
      setUsers(fresh);
      if (!silent) {
        showToast(id ? (lang === 'ar' ? 'تم تعديل المستخدم' : 'User updated') : (lang === 'ar' ? 'تمت إضافة المستخدم' : 'User added'));
      }
      return result;
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  const removeUser = async (id) => {
    if (user?.isDemo) {
      showToast(lang === 'ar' ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error');
      throw new Error('Demo Mode');
    }
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
    if (user?.isDemo) {
      showToast(lang === 'ar' ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error');
      return;
    }
    try {
      await api.updateCompany(data);
      setCompany(prev => ({ ...prev, ...data }));
      showToast(lang === 'ar' ? 'تم حفظ إعدادات الشركة' : 'Company settings saved');
    } catch (e) {
      showToast(e.message || 'Error', 'error');
      throw e;
    }
  };

  const uploadCompanyLogo = async (file) => {
    if (user?.isDemo) {
      showToast(lang === 'ar' ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error');
      return;
    }
    try {
      const res = await api.uploadCompanyLogo(file);
      setCompany(prev => ({ ...prev, logo: res.logo }));
      showToast(lang === 'ar' ? 'تم رفع الشعار بنجاح' : 'Logo uploaded successfully');
    } catch (e) {
      showToast(e.message || 'Error uploading logo', 'error');
      throw e;
    }
  };

  const uploadCompanyStamp = async (file) => {
    try {
      const res = await api.uploadCompanyStamp(file);
      setCompany(prev => ({ ...prev, stamp: res.stamp }));
      showToast(lang === 'ar' ? 'تم تحديث الختم' : 'Stamp updated successfully', 'success');
      return res;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const doUpdateProfile = async (data) => {
    if (user?.isDemo) {
      showToast(lang === 'ar' ? 'غير متاح في وضع التجربة' : 'Action disabled in Demo Mode', 'error');
      return;
    }
    try {
      const updatedUser = await api.updateProfile(data);
      setUser({ ...updatedUser, perms: user.perms, isDemo: user.isDemo });
      showToast(lang === 'ar' ? 'تم تحديث الملف الشخصي' : 'Profile updated successfully');
    } catch (e) {
      showToast(e.message || 'Error updating profile', 'error');
      throw e;
    }
  };

  // ── Expose ────────────────────────────────────────────────────────────────
  const value = {
    user, company, authed, loading,
    lang, setLang, theme, setTheme,
    items, depts, cats, users, stats, warehouses,
    lastSync, liveTx, liveItem, syncing, socketStatus,
    login, loginDemo, loginWithToken, logout, loadData: reloadData,
    toasts, showToast, removeToast,
    saveItem, removeItem,
    saveTx, removeTx,
    saveUser, removeUser,
    doUpdateCompany, uploadCompanyLogo, uploadCompanyStamp, doUpdateProfile,
    t: T[lang] || T.en,
    isAR: lang === 'ar',
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
