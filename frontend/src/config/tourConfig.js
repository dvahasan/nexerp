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
    target: '.tour-theme-toggle',
    content: 'You can toggle between Dark and Light mode from here.',
    title: 'Theme Settings',
    disableBeacon: true,
    disableOverlay: true,
    placement: 'bottom',
  },
  {
    target: '.tour-sidebar-toggle',
    content: 'Click here to collapse or expand the main menu. On mobile, this will open the drawer.',
    title: 'Sidebar Toggle',
    disableBeacon: true,
    disableOverlay: true,
    placement: 'right',
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
    target: '.tour-inventory-link',
    content: 'Let\'s head over to the Inventory page. This is where you manage your stock!',
    title: 'Inventory Module',
    disableBeacon: true,
    placement: 'right',
    route: '/dashboard',
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
    target: '.tour-permissions-link',
    content: 'Now let\'s check out the Settings and Permissions. This module is restricted to Admins and Owners.',
    title: 'Settings & Permissions',
    disableBeacon: true,
    placement: 'right',
    route: '/inventory',
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
    target: '.tour-tx-link',
    content: 'Finally, the Transactions section tracks every item entering or leaving the inventory.',
    title: 'Transactions Module',
    disableBeacon: true,
    placement: 'right',
    route: '/permissions',
  },
  {
    target: '.tour-tx-history',
    content: 'You can view a complete log of all inbound transactions here.',
    title: 'Transaction History',
    disableBeacon: true,
    placement: 'top',
    route: '/stock-in',
  },
  {
    target: '.tour-dashboard-link',
    content: 'That concludes the tour! Click here to return to your Dashboard.',
    title: 'End of Tour',
    disableBeacon: true,
    placement: 'right',
    route: '/stock-in',
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
