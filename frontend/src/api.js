// src/api.js  — all API calls to the backend
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function token() { return localStorage.getItem("nexerp_token"); }

async function req(method, path, body, isForm = false) {
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
  login:  (username, password) => req("POST", "/auth/login", { username, password }),
  me:     ()                    => req("GET",  "/auth/me"),

  // Departments
  getDepts:   ()      => req("GET",    "/departments"),
  addDept:    (d)     => req("POST",   "/departments", d),
  updateDept: (id, d) => req("PUT",    `/departments/${id}`, d),
  deleteDept: (id)    => req("DELETE", `/departments/${id}`),

  // Categories
  getCats:   ()      => req("GET",    "/categories"),
  addCat:    (c)     => req("POST",   "/categories", c),
  deleteCat: (id)    => req("DELETE", `/categories/${id}`),

  // Items
  getItems:       (params = {}) => req("GET", "/items?" + new URLSearchParams(params)),
  getItem:        (id)          => req("GET",  `/items/${id}`),
  getByBarcode:   (code)        => req("GET",  `/items/barcode/${code}`),
  addItem:        (d)           => req("POST",   "/items", d),
  updateItem:     (id, d)       => req("PUT",    `/items/${id}`, d),
  deleteItem:     (id)          => req("DELETE", `/items/${id}`),
  uploadPhoto:    (id, file)    => { const fd = new FormData(); fd.append("photo", file); return req("POST", `/items/${id}/photo`, fd, true); },

  // Transactions
  getTxs:  (params = {}) => req("GET",  "/transactions?" + new URLSearchParams(params)),
  addTx:   (d)           => req("POST", "/transactions", d),

  // Users
  getUsers:   ()      => req("GET",    "/users"),
  getUser:    (id)    => req("GET",    `/users/${id}`),
  addUser:    (d)     => req("POST",   "/users", d),
  updateUser: (id, d) => req("PUT",    `/users/${id}`, d),
  deleteUser: (id)    => req("DELETE", `/users/${id}`),

  // Stats
  getStats: () => req("GET", "/stats"),
};
