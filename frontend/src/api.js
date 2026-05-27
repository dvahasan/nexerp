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
  getDepts: () => req("GET", "/departments"),
  addDept: (data) => req("POST", "/departments", data),
  updateDept: (id, data) => req("PUT", `/departments/${id}`, data),
  deleteDept: (id) => req("DELETE", `/departments/${id}`),

  // Categories
  getCats: () => req("GET", "/categories"),
  addCat: (data) => req("POST", "/categories", data),
  updateCat: (id, data) => req("PUT", `/categories/${id}`, data),
  deleteCat: (id) => req("DELETE", `/categories/${id}`),

  // Sources
  getSources: () => req("GET", "/sources"),
  addSource: (data) => req("POST", "/sources", data),
  updateSource: (id, data) => req("PUT", `/sources/${id}`, data),
  deleteSource: (id) => req("DELETE", `/sources/${id}`),

  // Destinations
  getDestinations: () => req("GET", "/destinations"),
  addDestination: (data) => req("POST", "/destinations", data),
  updateDestination: (id, data) => req("PUT", `/destinations/${id}`, data),
  deleteDestination: (id) => req("DELETE", `/destinations/${id}`),

  // Projects
  getProjects: () => req("GET", "/projects"),
  addProject: (data) => req("POST", "/projects", data),
  updateProject: (id, data) => req("PUT", `/projects/${id}`, data),
  deleteProject: (id) => req("DELETE", `/projects/${id}`),

  // Reasons
  getReasons: () => req("GET", "/reasons"),
  addReason: (data) => req("POST", "/reasons", data),
  updateReason: (id, data) => req("PUT", `/reasons/${id}`, data),
  deleteReason: (id) => req("DELETE", `/reasons/${id}`),

  // Items
  getItems:       (params = {}) => req("GET", "/items?" + new URLSearchParams({ all: "1", _t: Date.now(), ...params })),
  getItemsPaged:  (params = {}) => req("GET", "/items?" + new URLSearchParams({ _t: Date.now(), ...params })),
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
  getTxs: (params) => {
    const qs = new URLSearchParams({ ...params, _t: Date.now() }).toString();
    return req("GET", `/transactions?${qs}`);
  },
  getInvoiceTxs: (invoiceNo) => req("GET", `/transactions/invoice/${invoiceNo}`),
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
  uploadCompanyStamp:(file)=> { const fd = new FormData(); fd.append("stamp", file); return req("POST", `/company/stamp`, fd, true); },

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

  // Warehouses
  getWarehouses:    ()          => req("GET",    "/warehouses"),
  getWarehouse:     (id)        => req("GET",    `/warehouses/${id}`),
  addWarehouse:     (d)         => req("POST",   "/warehouses", d),
  updateWarehouse:  (id, d)     => req("PUT",    `/warehouses/${id}`, d),
  deleteWarehouse:  (id)        => req("DELETE", `/warehouses/${id}`),

  // Bins
  getBins:     (params = {}) => req("GET",    "/bins?" + new URLSearchParams(params)),
  addBin:      (d)           => req("POST",   "/bins", d),
  updateBin:   (id, d)       => req("PUT",    `/bins/${id}`, d),
  deleteBin:   (id)          => req("DELETE", `/bins/${id}`),

  // BOM (Bill of Materials)
  getBoms:     ()        => req("GET",    "/bom"),
  getBom:      (id)      => req("GET",    `/bom/${id}`),
  addBom:      (d)       => req("POST",   "/bom", d),
  updateBom:   (id, d)   => req("PUT",    `/bom/${id}`, d),
  deleteBom:   (id)      => req("DELETE", `/bom/${id}`),
  produceBom:  (id, d)   => req("POST",   `/bom/${id}/produce`, d),
  getBomHistory: (id)    => req("GET",    `/bom/${id}/production-history`),
};
