export const systemTourSteps = [
  {
    target: '.tour-navbar',
    content: 'Welcome to NexINV! This is the main navigation bar. Here you can search, change language, and access the tour menu.',
    title: 'Top Navbar',
    disableBeacon: true,
    disableOverlay: true,
    placement: 'bottom',
  },
  {
    target: '.tour-global-analytics',
    content: 'This area shows your Global Analytics, including your total stock value and transaction volume across all companies.',
    title: 'Global Analytics',
    disableBeacon: true,
    placement: 'top',
    route: '/dashboard',
  },
  {
    target: '.tour-warehouse-page',
    content: 'Here you manage your warehouses, locations, and track storage capacity.',
    title: 'Warehouses',
    disableBeacon: true,
    placement: 'center',
    route: '/warehouses',
  },
  {
    target: '.tour-bom-page',
    content: 'Bill of Materials (BOM). Manage your product assemblies and manufacturing components here.',
    title: 'Bill of Materials',
    disableBeacon: true,
    placement: 'center',
    route: '/bom',
  },
  {
    target: '.tour-inventory-link',
    content: 'Let\'s head over to the Inventory page. This is where you manage your stock!',
    title: 'Inventory Module',
    disableBeacon: true,
    placement: 'right',
    route: '/bom',
  },
  {
    target: '.tour-add-item',
    content: 'Here you can add new items to your inventory. You can upload images, set stock limits, and categorize them.',
    title: 'Add New Item',
    disableBeacon: true,
    placement: 'bottom',
    route: '/inventory',
  },
  {
    target: '.tour-departments-page',
    content: 'Departments allow you to logically group different parts of your organization.',
    title: 'Departments',
    disableBeacon: true,
    placement: 'center',
    route: '/departments',
  },
  {
    target: '.tour-categories-page',
    content: 'Categories let you hierarchically organize your inventory items.',
    title: 'Categories',
    disableBeacon: true,
    placement: 'center',
    route: '/categories',
  },
  {
    target: '.tour-tx-page',
    content: 'Stock In: Record incoming inventory shipments or supplier deliveries.',
    title: 'Stock In',
    disableBeacon: true,
    placement: 'center',
    route: '/stock-in',
  },
  {
    target: '.tour-tx-page',
    content: 'Stock Out: Record outgoing items for orders, consumption, or adjustments.',
    title: 'Stock Out',
    disableBeacon: true,
    placement: 'center',
    route: '/stock-out',
  },
  {
    target: '.tour-users-page',
    content: 'Manage your staff, assign roles, and handle user accounts here.',
    title: 'Users Management',
    disableBeacon: true,
    placement: 'center',
    route: '/users',
  },
  {
    target: '.tour-permissions-matrix',
    content: 'This is the Permissions Matrix. Here you can easily toggle what each team member is allowed to do in the system.',
    title: 'Permissions',
    disableBeacon: true,
    placement: 'top',
    route: '/permissions',
  },
  {
    target: '.tour-settings-page',
    content: 'Global company settings. Configure live sync, basic info, and themes here.',
    title: 'Company Settings',
    disableBeacon: true,
    placement: 'center',
    route: '/settings',
  },
  {
    target: '.tour-company-page',
    content: 'Your public company profile and branding information.',
    title: 'Company Profile',
    disableBeacon: true,
    placement: 'center',
    route: '/profile',
  },
  {
    target: '.tour-profile-page',
    content: 'And finally, your personal profile page where you can manage your own preferences.',
    title: 'My Profile',
    disableBeacon: true,
    placement: 'center',
    route: '/myprofile',
  },
  {
    target: '.tour-dashboard-link',
    content: 'That concludes the tour! Click here to return to your Dashboard.',
    title: 'End of Tour',
    disableBeacon: true,
    placement: 'right',
    route: '/myprofile',
  }
];

export const pageTours = {
  '/dashboard': [
    { target: '.tour-global-analytics', content: 'Global Analytics across all your companies.', title: 'Analytics', disableBeacon: true },
    { target: '.tour-companies-grid', content: 'Here you can select a company to view its specific dashboard or edit its settings.', title: 'Companies', disableBeacon: true }
  ],
  '/inventory': [
    { target: '.tour-add-item', content: 'Add a new inventory item.', title: 'Add Item', disableBeacon: true },
    { target: '.tour-inventory-search', content: 'Search by item name, SKU, or barcode.', title: 'Search', disableBeacon: true },
    { target: '.tour-inventory-filters', content: 'Filter items by category or department.', title: 'Filters', disableBeacon: true },
    { target: '.tour-inventory-table', content: 'This table shows your current stock levels and lets you manage individual items.', title: 'Stock Table', disableBeacon: true }
  ],
  '/permissions': [
    { target: '.tour-permissions-matrix', content: 'Toggle access modules for each user. Changes save automatically.', title: 'Permissions Matrix', disableBeacon: true }
  ],
  '/stock-in': [
    { target: '.tour-tx-history', content: 'A complete ledger of inbound stock movements.', title: 'Stock In Ledger', disableBeacon: true }
  ],
  '/stock-out': [
    { target: '.tour-tx-history', content: 'A complete ledger of outbound stock movements.', title: 'Stock Out Ledger', disableBeacon: true }
  ]
};
