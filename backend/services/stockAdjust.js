const { Ledger } = require("../models");

/**
 * Record a quantity change that happened outside the transaction engine
 * (item create/edit, imports) as an ADJUST ledger row, so that the sum of
 * ledger qtyChange keeps equalling Item.qty.
 */
async function recordAdjustment({ companyId, item, qtyBefore, qtyAfter, userId, notes, session }) {
  if (qtyAfter === qtyBefore) return null;
  const [row] = await Ledger.create([{
    companyId,
    itemId: item._id,
    type: "ADJUST",
    qtyChange: qtyAfter - qtyBefore,
    qtyBefore,
    qtyAfter,
    warehouseId: item.warehouseId || null,
    userId: userId || null,
    notes,
  }], { session });
  return row;
}

// Fields owned by the transaction engine or the tenant boundary; never taken
// from a request body.
const PROTECTED_ITEM_FIELDS = ["_id", "companyId", "avgCost", "reservedQty", "createdAt", "updatedAt"];

module.exports = { recordAdjustment, PROTECTED_ITEM_FIELDS };
