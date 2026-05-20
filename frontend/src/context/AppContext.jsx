import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [lang, setLang] = useState(() => localStorage.getItem("nexerp_lang") || "en");
  const [theme, setTheme] = useState(() => localStorage.getItem("nexerp_theme") || "light");

  const [items, setItems] = useState([]);
  const [depts, setDepts] = useState([]);
  const [cats, setCats] = useState([]);
  const [users, setUsers] = useState([]);
  const [txs, setTxs] = useState([]);
  const [stats, setStats] = useState(null);

  // Translations
  const t = {
    en: {
      login: "Login",
      companyCode: "Company Code",
      username: "Username",
      password: "Password",
      dashboard: "Dashboard",
      inventory: "Inventory",
      transactions: "Transactions",
      settings: "Settings",
      logout: "Logout",
      // Add more as needed
    },
    ar: {
      login: "تسجيل الدخول",
      companyCode: "رمز الشركة",
      username: "اسم المستخدم",
      password: "كلمة المرور",
      dashboard: "لوحة القيادة",
      inventory: "المخزون",
      transactions: "المعاملات",
      settings: "الإعدادات",
      logout: "تسجيل الخروج",
    }
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem("nexerp_lang", lang);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem("nexerp_theme", theme);
  }, [lang, theme]);

  const checkAuth = async () => {
    try {
      const data = await api.me();
      setUser({ ...data.user, perms: data.perms });
      setCompany(data.company);
      setAuthed(true);
      if (data.user.preferredLanguage) setLang(data.user.preferredLanguage);
      if (data.company?.theme) setTheme(data.company.theme);
    } catch (e) {
      setAuthed(false);
      setUser(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("nexerp_token")) checkAuth();
    else setLoading(false);
  }, []);

  const login = async (code, username, password) => {
    const data = await api.login(code, username, password);
    localStorage.setItem("nexerp_token", data.token);
    setUser({ ...data.user, perms: data.perms });
    setCompany(data.company);
    setAuthed(true);
    if (data.user.preferredLanguage) setLang(data.user.preferredLanguage);
    if (data.company?.theme) setTheme(data.company.theme);
  };

  const logout = () => {
    localStorage.removeItem("nexerp_token");
    setAuthed(false);
    setUser(null);
    setCompany(null);
  };

  const loadData = async () => {
    if (!authed) return;
    try {
      const [i, d, c, u, tData, s] = await Promise.all([
        api.getItems(), api.getDepts(), api.getCats(),
        user.perms?.canManageUsers ? api.getUsers() : Promise.resolve([]),
        api.getTxs(), api.getStats()
      ]);
      setItems(i); setDepts(d); setCats(c); setUsers(u); setTxs(tData); setStats(s);
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [authed]);

  const value = {
    user, company, authed, loading, lang, setLang, theme, setTheme,
    items, depts, cats, users, txs, stats,
    login, logout, loadData,
    t: t[lang] || t.en, isAR: lang === 'ar'
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
