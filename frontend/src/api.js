import { getMockDataForPath } from './demoData';

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function token() { return localStorage.getItem("nexinv_token"); }

let isDemoMode = false;
let demoTypeMode = null;

export const setDemoMode = (type) => {
  if (type) {
    isDemoMode = true;
    demoTypeMode = type;
  } else {
    isDemoMode = false;
    demoTypeMode = null;
  }
};
export const getDemoMode = () => isDemoMode;

async function req(method, path, body, isForm = false) {
  if (isDemoMode) {
    if (["POST", "PUT", "DELETE"].includes(method)) {
      if (path !== "/ai/chat" && !path.startsWith("/auth/")) {
        throw new Error("Action disabled in Demo Mode");
      }
    } else if (method === "GET") {
      return getMockDataForPath(path, demoTypeMode === "enterprise");
    }
  }

  const headers = {};
  const t = token();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  if (!isForm && body) headers["Content-Type"] = "application/json";

  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);
  return data;
}

export const api = {
  // Auth
  login:  (code, username, password) => req("POST", "/auth/login", { code, username, password }),
  register: (data) => req("POST", "/auth/register", data),
  me:     ()                    => req("GET",  "/auth/me"),
  updateProfile: (data)         => req("PUT", "/auth/profile", data),

  // Departments
  getDepts:   ()      => req("GET",    "/departments"),
  addDept:    (d)     => req("POST",   "/departments", d),
  updateDept: (id, d) => req("PUT",    `/departments/${id}`, d),
  deleteDept: (id)    => req("DELETE", `/departments/${id}`),

  // Categories
  getCats:   ()      => req("GET",    "/categories"),
  addCat:    (c)     => req("POST",   "/categories", c),
  updateCat: (id, c) => req("PUT",    `/categories/${id}`, c),
  deleteCat: (id)    => req("DELETE", `/categories/${id}`),

  // Items
  getItems:       (params = {}) => req("GET", "/items?" + new URLSearchParams({ all: "1", ...params })),
  getItemsPaged:  (params = {}) => req("GET", "/items?" + new URLSearchParams(params)),
  getItem:        (id)          => req("GET",  `/items/${id}`),
  getByBarcode:   (code)        => req("GET",  `/items/barcode/${code}`),
  addItem:        (d)           => req("POST",   "/items", d),
  updateItem:     (id, d)       => req("PUT",    `/items/${id}`, d),
  deleteItem:     (id)          => req("DELETE", `/items/${id}`),
  importItems:    (items)       => req("POST",   "/items/import", { items }),
  uploadPhoto:       (id, file)  => { const fd = new FormData(); fd.append("photo", file); return req("POST", `/items/${id}/photo`, fd, true); },
  importPhotoFromUrl:(id, url)   => req("POST", `/items/${id}/photo-from-url`, { url }),
  addItemPhoto:    (id, file)     => { const fd = new FormData(); fd.append("photo", file); return req("POST", `/items/${id}/photos`, fd, true); },
  deleteItemPhoto: (id, publicId) => req("DELETE", `/items/${id}/photos/${encodeURIComponent(publicId)}`),
  uploadAttachment:(id, file)     => { const fd = new FormData(); fd.append("file", file); return req("POST", `/items/${id}/attachment`, fd, true); },
  deleteAttachment:(id, publicId) => req("DELETE", `/items/${id}/attachments/${encodeURIComponent(publicId)}`),

  // Transactions
  getTxs:      (params = {}) => req("GET", "/transactions?" + new URLSearchParams(params)),
  addTx:    (d)           => req("POST",   "/transactions", d),
  updateTx: (id, d)       => req("PUT",    `/transactions/${id}`, d),
  deleteTx: (id)          => req("DELETE", `/transactions/${id}`),

  // Users
  getUsers:      ()           => req("GET", "/users"),
  getUsersPaged: (params = {}) => req("GET", "/users?" + new URLSearchParams(params)),
  getUser:    (id)    => req("GET",    `/users/${id}`),
  addUser:    (d)     => req("POST",   "/users", d),
  updateUser: (id, d) => req("PUT",    `/users/${id}`, d),
  deleteUser: (id)    => req("DELETE", `/users/${id}`),

  // Files
  getFiles:   ()      => req("GET", "/files"),
  deleteFile: (id)    => req("DELETE", `/files/${id}`),
  uploadFile: (file, itemId) => { 
    const fd = new FormData(); 
    fd.append("file", file); 
    if (itemId) fd.append("itemId", itemId);
    return req("POST", "/files", fd, true); 
  },

  // Stats
  getStats: () => req("GET", "/stats"),

  // Settings & Company
  getSettings:    ()  => req("GET", "/settings"),
  updateSettings: (d) => req("PUT", "/settings", d),
  updateCompany:  (d) => req("PUT", "/company", d),
  uploadCompanyLogo:(file)=> { const fd = new FormData(); fd.append("logo", file); return req("POST", `/company/logo`, fd, true); },

  // Enterprise
  getEnterpriseCompanies: () => req("GET", "/enterprise/companies"),
  createEnterpriseCompany: (data) => req("POST", "/enterprise/companies", data),
  assumeEnterpriseCompany: (id) => req("POST", `/enterprise/assume/${id}`),
  exitEnterpriseCompany: () => req("POST", "/enterprise/exit"),

  // Admin
  getCloudinaryUsage: () => req("GET", "/admin/cloudinary"),

  // AI
  aiChat: (prompt, history = []) => req("POST", "/ai/chat", { prompt, history }),

  // Barcode lookup (server-side proxy — avoids CORS)
  lookupBarcode: (code) => req("GET", `/barcode/${encodeURIComponent(code)}`),
};
