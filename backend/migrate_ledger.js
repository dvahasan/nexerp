require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');
const Transaction = require('./models/Transaction');
const Ledger = require('./models/Ledger');
const ItemStockLocation = require('./models/ItemStockLocation');
const connectDB = require('./config/db');

async function run() {
  await connectDB();
  console.log('Connected to DB');

  try {
    const txs = await Transaction.find().sort({ createdAt: 1 }).lean();
    console.log(`Found ${txs.length} transactions to migrate`);

    // We will build item histories
    const itemQtyMap = {};

    for (const tx of txs) {
      const itemId = tx.itemId.toString();
      
      if (!itemQtyMap[itemId]) {
        itemQtyMap[itemId] = { qty: 0, locations: {} };
      }

      const state = itemQtyMap[itemId];
      const prevQty = state.qty;
      const qtyChange = tx.type === 'IN' ? tx.qty : -tx.qty;
      const newQty = prevQty + qtyChange;
      
      // Update running ledger
      state.qty = newQty;

      // Update location tracking
      const whId = tx.warehouseId ? tx.warehouseId.toString() : 'NONE';
      const binId = tx.binId ? tx.binId.toString() : 'NONE';
      const locKey = `${whId}_${binId}`;

      if (!state.locations[locKey]) {
        state.locations[locKey] = 0;
      }
      state.locations[locKey] += qtyChange;

      // Create Ledger Entry
      await Ledger.create({
        companyId: tx.companyId,
        itemId: tx.itemId,
        transactionId: tx._id,
        type: tx.type,
        qtyChange: qtyChange,
        qtyBefore: prevQty,
        qtyAfter: newQty,
        warehouseId: tx.warehouseId || null,
        binId: tx.binId || null,
        sourceId: tx.sourceId || null,
        destId: tx.destId || null,
        projectId: tx.projectId || null,
        reasonId: tx.reasonId || null,
        userId: tx.userId || null,
        notes: tx.notes || 'Legacy migration',
        createdAt: tx.createdAt, // Preserve original date
      });
    }

    // Upsert ItemStockLocation documents based on final computed states
    console.log('Writing ItemStockLocation documents...');
    for (const [itemId, state] of Object.entries(itemQtyMap)) {
      const item = await Item.findById(itemId);
      if (!item) continue;

      for (const [locKey, qty] of Object.entries(state.locations)) {
        const [whId, binId] = locKey.split('_');
        
        await ItemStockLocation.findOneAndUpdate(
          {
            companyId: item.companyId,
            itemId: item._id,
            warehouseId: whId === 'NONE' ? null : whId,
            binId: binId === 'NONE' ? null : binId,
          },
          {
            $set: { qty: qty, reservedQty: 0 }
          },
          { upsert: true, new: true }
        );
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

run();
