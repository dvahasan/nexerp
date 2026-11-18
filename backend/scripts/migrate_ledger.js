/**
 * One-time backfill: create Ledger entries for transactions recorded before the
 * ledger feature existed, and update ItemStockLocation totals from history.
 *
 * Replaces the older root-level migrate_ledger.js, which was NOT idempotent
 * (it duplicated ledger rows on re-run and zeroed reservedQty).
 *
 * IDEMPOTENT: transactions that already have a ledger row are skipped, so the
 * script is safe to run on a database where runtime ledger writes already exist.
 * It does NOT touch reservedQty.
 *
 * Run with: node scripts/migrate_ledger.js            (dry run — reports only)
 *           node scripts/migrate_ledger.js --apply    (writes)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const Ledger = require('../models/Ledger');
const ItemStockLocation = require('../models/ItemStockLocation');

const APPLY = process.argv.includes('--apply');

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected. Mode: ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'}`);

  try {
    // Which transactions already have ledger coverage?
    const covered = new Set(
      (await Ledger.distinct('transactionId')).filter(Boolean).map(String)
    );

    const txs = await Transaction.find().sort({ createdAt: 1 }).lean();
    const missing = txs.filter(tx => !covered.has(tx._id.toString()));
    console.log(`${txs.length} transactions total; ${covered.size} already in ledger; ${missing.length} missing.`);

    if (missing.length === 0) {
      console.log('Nothing to backfill. Done.');
      return;
    }
    if (!APPLY) {
      console.log('Dry run complete — rerun with --apply to backfill the missing entries.');
      return;
    }

    // Replay missing transactions in order, per item
    const itemQtyMap = {};
    for (const tx of missing) {
      const itemId = tx.itemId.toString();
      if (!itemQtyMap[itemId]) itemQtyMap[itemId] = { qty: 0, locations: {} };

      const state = itemQtyMap[itemId];
      const prevQty = state.qty;
      const qtyChange = tx.type === 'IN' ? tx.qty : -tx.qty;
      state.qty = prevQty + qtyChange;

      const whId = tx.warehouseId ? tx.warehouseId.toString() : 'NONE';
      const binId = tx.binId ? tx.binId.toString() : 'NONE';
      const locKey = `${whId}_${binId}`;
      state.locations[locKey] = (state.locations[locKey] || 0) + qtyChange;

      await Ledger.create({
        companyId: tx.companyId,
        itemId: tx.itemId,
        transactionId: tx._id,
        type: tx.type,
        qtyChange,
        qtyBefore: prevQty,
        qtyAfter: state.qty,
        warehouseId: tx.warehouseId || null,
        binId: tx.binId || null,
        sourceId: tx.sourceId || null,
        destId: tx.destId || null,
        projectId: tx.projectId || null,
        reasonId: tx.reasonId || null,
        userId: tx.userId || null,
        notes: tx.notes || 'Legacy migration',
      });
    }
    console.log(`Backfilled ${missing.length} ledger entries.`);

    // Update location totals for the affected items only.
    // $inc (not $set) so totals written by runtime transactions are preserved;
    // reservedQty is intentionally never touched.
    console.log('Updating ItemStockLocation documents...');
    for (const [itemId, state] of Object.entries(itemQtyMap)) {
      const item = await Item.findById(itemId);
      if (!item) continue;

      for (const [locKey, qty] of Object.entries(state.locations)) {
        if (qty === 0) continue;
        const [whId, binId] = locKey.split('_');
        await ItemStockLocation.findOneAndUpdate(
          {
            companyId: item.companyId,
            itemId: item._id,
            warehouseId: whId === 'NONE' ? null : whId,
            binId: binId === 'NONE' ? null : binId,
          },
          { $inc: { qty } },
          { upsert: true, new: true }
        );
      }
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
