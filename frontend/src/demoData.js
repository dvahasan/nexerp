// frontend/src/demoData.js
// Completely decoupled mock database for Demo Tour

// ── Models & State ──────────────────────────────────────────
const DEPARTMENTS = [
  { _id: 'd1', name: 'Electrical', nameEn: 'Electrical', color: '#f59e0b' },
  { _id: 'd2', name: 'Mechanical', nameEn: 'Mechanical', color: '#3b82f6' },
  { _id: 'd3', name: 'IT & Network', nameEn: 'IT & Network', color: '#8b5cf6' },
];

const CATEGORIES = [
  { _id: 'c1', deptId: 'd1', name: 'Motors', nameEn: 'Motors' },
  { _id: 'c2', deptId: 'd1', name: 'Cables', nameEn: 'Cables' },
  { _id: 'c3', deptId: 'd2', name: 'Pumps', nameEn: 'Pumps' },
  { _id: 'c4', deptId: 'd3', name: 'Servers', nameEn: 'Servers' },
];

const USERS = [
  { _id: 'u1', name: 'System Admin', username: 'admin', role: 'owner', email: 'admin@demo.com', active: true },
  { _id: 'u2', name: 'Warehouse Manager', username: 'manager', role: 'manager', email: 'manager@demo.com', active: true },
  { _id: 'u3', name: 'John Doe', username: 'john', role: 'warehouse', email: 'john@demo.com', active: true },
];

const ITEMS = [
  {
    _id: 'i1', deptId: 'd1', catId: 'c1', sku: 'EM-001', barcode: '1000001', price: 4500, qty: 24, minThreshold: 5,
    name: 'محرك كهربائي 5HP', nameEn: 'Electric Motor 5HP', type: 'unit', status: 'active',
    description: 'Industrial 3-phase electric motor',
    photos: ['https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop']
  },
  {
    _id: 'i2', deptId: 'd2', catId: 'c3', sku: 'HP-002', barcode: '1000002', price: 8200, qty: 3, minThreshold: 5,
    name: 'مضخة هيدروليكية', nameEn: 'Hydraulic Pump', type: 'unit', status: 'active',
    description: 'High pressure centrifugal pump',
    photos: ['https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop']
  },
  {
    _id: 'i3', deptId: 'd1', catId: 'c2', sku: 'CC-003', barcode: '1000003', price: 85, qty: 800, minThreshold: 100,
    name: 'كابل نحاسي 16مم', nameEn: 'Copper Cable 16mm', type: 'roll', status: 'active',
    description: 'Heavy duty power cable per meter',
    photos: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop']
  },
  {
    _id: 'i4', deptId: 'd3', catId: 'c4', sku: 'SRV-04', barcode: '1000004', price: 12500, qty: 12, minThreshold: 2,
    name: 'خادم شبكي 2U', nameEn: 'Rack Server 2U', type: 'unit', status: 'active',
    description: 'Enterprise rackmount server 64GB RAM',
    photos: ['https://images.unsplash.com/photo-1558564030-22c6e6e226a2?w=400&h=300&fit=crop']
  },
  {
    _id: 'i5', deptId: 'd2', catId: 'c3', sku: 'GB-005', barcode: '1000005', price: 1200, qty: 0, minThreshold: 10,
    name: 'علبة تروس', nameEn: 'Industrial Gearbox', type: 'unit', status: 'active',
    description: 'Out of stock gearbox',
    photos: []
  }
];

const TRANSACTIONS = [
  { _id: 't1', type: 'in', itemId: ITEMS[0], qty: 30, price: 4200, date: new Date(Date.now() - 86400000 * 5).toISOString(), createdBy: USERS[0], notes: 'Initial stock' },
  { _id: 't2', type: 'out', itemId: ITEMS[0], qty: 6, price: 4500, date: new Date(Date.now() - 86400000 * 2).toISOString(), createdBy: USERS[1], notes: 'Sale to client A' },
  { _id: 't3', type: 'in', itemId: ITEMS[2], qty: 1000, price: 80, date: new Date(Date.now() - 86400000 * 10).toISOString(), createdBy: USERS[0], notes: 'Supplier delivery' },
  { _id: 't4', type: 'out', itemId: ITEMS[2], qty: 200, price: 85, date: new Date().toISOString(), createdBy: USERS[2], notes: 'Project installation' },
];

const FILES = [];

const WAREHOUSES = [
  {
    _id: 'wh1', code: 'WH-A', name: 'المستودع الرئيسي', nameEn: 'Main Warehouse',
    location: 'Industrial Zone, Building 1', active: true,
    length: 40, width: 25, height: 8,
    usableAreaPct: 0.85, palletFootprint: 0.96,
    usableArea: 850, maxPallets: 885, totalVolume: 6800,
    occupancyPct: 62, usedPallets: 550, itemCount: 4, alert85: false,
  },
  {
    _id: 'wh2', code: 'WH-B', name: 'مستودع القطع الإلكترونية', nameEn: 'Electronics Warehouse',
    location: 'Tech Park, Unit 5', active: true,
    length: 20, width: 15, height: 6,
    usableAreaPct: 0.85, palletFootprint: 0.96,
    usableArea: 255, maxPallets: 265, totalVolume: 1530,
    occupancyPct: 88, usedPallets: 233, itemCount: 1, alert85: true,
  },
];

const BINS = [
  { _id: 'b1', warehouseId: 'wh1', code: 'A1-01', zone: 'A', aisle: '1', level: '01', capacity: 10, active: true },
  { _id: 'b2', warehouseId: 'wh1', code: 'A1-02', zone: 'A', aisle: '1', level: '02', capacity: 10, active: true },
  { _id: 'b3', warehouseId: 'wh1', code: 'B2-01', zone: 'B', aisle: '2', level: '01', capacity: 8,  active: true },
  { _id: 'b4', warehouseId: 'wh2', code: 'E1-01', zone: 'E', aisle: '1', level: '01', capacity: 5,  active: true },
];

const BOMS = [
  {
    _id: 'bom1',
    name: 'وحدة ضخ هيدروليكية',
    nameEn: 'Hydraulic Pump Assembly',
    outputItemId: { _id: 'i2', name: 'مضخة هيدروليكية', nameEn: 'Hydraulic Pump', qty: 3 },
    outputQty: 1,
    components: [
      { itemId: { _id: 'i1', name: 'محرك كهربائي 5HP', nameEn: 'Electric Motor 5HP', qty: 24 }, qty: 1, unit: 'unit' },
      { itemId: { _id: 'i5', name: 'علبة تروس', nameEn: 'Industrial Gearbox', qty: 0 },          qty: 1, unit: 'unit' },
    ],
    notes: 'Standard hydraulic pump assembly',
    active: true,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    _id: 'bom2',
    name: 'حزمة الكابلات',
    nameEn: 'Cable Bundle Kit',
    outputItemId: { _id: 'i4', name: 'خادم شبكي 2U', nameEn: 'Rack Server 2U', qty: 12 },
    outputQty: 1,
    components: [
      { itemId: { _id: 'i3', name: 'كابل نحاسي 16مم', nameEn: 'Copper Cable 16mm', qty: 800 }, qty: 50, unit: 'meter' },
    ],
    notes: 'Server installation cable kit',
    active: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const ENTERPRISE_COMPANIES = [
  { _id: 'e1', code: 'E-TECH', name: 'ElectroTech Industries', description: 'Main hardware division', industry: 'Technology', primaryColor: '#3b82f6' },
  { _id: 'e2', code: 'A-BUILD', name: 'Alpha Builders', description: 'Construction materials', industry: 'Construction', primaryColor: '#f97316' },
  { _id: 'e3', code: 'M-MED', name: 'Medica Supplies', description: 'Medical equipment supply chain', industry: 'Healthcare', primaryColor: '#10b981' },
];

const MOCK_COMPANY = {
  _id: 'comp1',
  code: 'DEMO',
  name: 'ElectroTech Demo',
  baseCurrency: 'USD',
  theme: 'dark',
  primaryColor: '#3b82f6',
  activeIconPack: 'lucide'
};

const MOCK_PERMS = {
  canAddItems: true, canEditItems: true, canDeleteItems: true,
  canTxIn: true, canTxOut: true, canManageUsers: true,
  canManageDepts: true, canManageCompany: true
};

// ── Router Logic ──────────────────────────────────────────────
export const getMockDataForPath = async (path, isEnterprise) => {
  // Extract path without query params
  const url = new URL(path, 'http://localhost');
  const route = url.pathname;
  const params = Object.fromEntries(url.searchParams.entries());

  // Simulate network latency
  await new Promise(r => setTimeout(r, 400));

  // ── Auth ──
  if (route === '/auth/me') {
    if (isEnterprise) {
      return {
        user: { _id: 'ent1', username: 'ent_owner', name: 'Enterprise Owner', role: 'owner', isEnterprise: true },
        company: null,
        perms: MOCK_PERMS
      };
    }
    return {
      user: USERS[0],
      company: MOCK_COMPANY,
      perms: MOCK_PERMS
    };
  }

  // ── Departments / Categories / Users ──
  if (route === '/departments') return DEPARTMENTS;
  if (route === '/categories') return CATEGORIES;
  if (route === '/users') {
    if (params.page) {
      // paginated
      return { users: USERS, total: USERS.length, page: 1, pages: 1 };
    }
    return USERS;
  }
  
  if (route.startsWith('/users/')) {
    const id = route.split('/').pop();
    return USERS.find(u => u._id === id);
  }

  // ── Enterprise ──
  if (route === '/enterprise/companies') return ENTERPRISE_COMPANIES;
  if (route.startsWith('/enterprise/assume')) return { success: true };

  // ── Files ──
  if (route === '/files') return FILES;

  // ── Barcode Lookup ──
  if (route.startsWith('/barcode/')) {
    const code = route.split('/').pop();
    const item = ITEMS.find(i => i.barcode === code || i.sku === code);
    if (!item) throw new Error('Not found');
    return item;
  }

  // ── Stats ──
  if (route === '/stats') {
    const totalValue = ITEMS.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const lowStock = ITEMS.filter(i => i.qty <= i.minThreshold).length;
    const stockoutItems = ITEMS.filter(i => i.qty === 0).length;
    return {
      totalItems: ITEMS.length,
      totalValue,
      lowStock,
      recentTxs: TRANSACTIONS.length,
      categories: [
        { name: 'Motors', value: 1 },
        { name: 'Pumps', value: 1 },
        { name: 'Cables', value: 1 },
        { name: 'Servers', value: 1 }
      ],
      // KPI fields
      inventoryTurnover: 4.2,
      dsi: 87,
      stockoutRate: +((stockoutItems / ITEMS.length) * 100).toFixed(1),
      cogs30: 42800,
      cogsTrend: 12.5,
      reorderAlerts: [
        { _id: 'i2', name: 'مضخة هيدروليكية', nameEn: 'Hydraulic Pump', qty: 3, reorderPoint: 5, reorderQty: 10 },
        { _id: 'i5', name: 'علبة تروس',        nameEn: 'Industrial Gearbox', qty: 0, reorderPoint: 10, reorderQty: 20 },
      ],
    };
  }

  // ── Warehouses ──
  if (route === '/warehouses') return WAREHOUSES;
  if (route.match(/^\/warehouses\/[^/]+$/)) {
    const id = route.split('/').pop();
    const wh = WAREHOUSES.find(w => w._id === id);
    if (!wh) throw new Error('Warehouse not found');
    return { ...wh, items: ITEMS.slice(0, 3), bins: BINS.filter(b => b.warehouseId === id) };
  }

  // ── Bins ──
  if (route === '/bins') {
    const { warehouseId } = params;
    return warehouseId ? BINS.filter(b => b.warehouseId === warehouseId) : BINS;
  }

  // ── BOM ──
  if (route === '/bom') return BOMS;
  if (route.match(/^\/bom\/[^/]+$/)) {
    const id = route.split('/').pop();
    return BOMS.find(b => b._id === id) || null;
  }

  // ── Items ──
  if (route === '/items') {
    let filtered = [...ITEMS];
    if (params.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter(i => 
        i.name?.toLowerCase().includes(s) || 
        i.nameEn?.toLowerCase().includes(s) || 
        i.sku?.toLowerCase().includes(s)
      );
    }
    if (params.dept) filtered = filtered.filter(i => i.deptId === params.dept);
    if (params.cat) filtered = filtered.filter(i => i.catId === params.cat);

    if (params.all) return filtered;

    const limit = parseInt(params.limit || '10');
    const page = parseInt(params.page || '1');
    const start = (page - 1) * limit;
    
    return {
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      pages: Math.ceil(filtered.length / limit) || 1
    };
  }
  
  if (route.match(/^\/items\/[^/]+$/)) {
    const id = route.split('/').pop();
    return ITEMS.find(i => i._id === id);
  }

  // ── Transactions ──
  if (route === '/transactions') {
    let filtered = [...TRANSACTIONS].sort((a,b) => new Date(b.date) - new Date(a.date));
    if (params.type) filtered = filtered.filter(t => t.type === params.type);
    
    const limit = parseInt(params.limit || '15');
    const page = parseInt(params.page || '1');
    const start = (page - 1) * limit;

    return {
      transactions: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      pages: Math.ceil(filtered.length / limit) || 1
    };
  }

  // ── Cloudinary Admin ──
  if (route === '/admin/cloudinary') {
    return {
      usage: { credits: { usage: 1.5, limit: 25 } },
      folders: [{ name: 'nexinv', storage_bytes: 1024 * 1024 * 15 }]
    };
  }

  // Fallback
  return {};
};
