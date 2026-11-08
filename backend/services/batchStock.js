const { Batch } = require("../models");

/**
 * Put received stock of a batch-tracked item into a batch.
 *
 * Every unit of a batch-tracked item must live in some batch, otherwise FEFO
 * picking sees less batch stock than Item.qty and rejects valid OUTs. When the
 * receiver doesn't supply a batch number, the stock goes into `fallbackBatchNo`
 * (callers pass the receipt's invoice number) with no expiry, which FEFO
 * consumes last.
 *
 * Returns the descriptor stored on Transaction.batches.
 */
async function receiveIntoBatch({
  companyId, itemId, qty, batchNo, fallbackBatchNo,
  mfgDate, expiryDate, supplierLot, warehouseId, binId, session,
}) {
  const bNo = String(batchNo || fallbackBatchNo).trim();

  let batch = await Batch.findOne({ companyId, itemId, batchNo: bNo }).session(session);
  if (batch) {
    batch.qtyRemaining += qty;
    if (mfgDate)     batch.mfgDate     = new Date(mfgDate);
    if (expiryDate)  batch.expiryDate  = new Date(expiryDate);
    if (supplierLot) batch.supplierLot = String(supplierLot).trim();
    await batch.save({ session });
  } else {
    [batch] = await Batch.create([{
      companyId,
      itemId,
      batchNo:      bNo,
      mfgDate:      mfgDate    ? new Date(mfgDate)    : null,
      expiryDate:   expiryDate ? new Date(expiryDate) : null,
      supplierLot:  supplierLot ? String(supplierLot).trim() : "",
      qtyRemaining: qty,
      warehouseId:  warehouseId || null,
      binId:        binId || null,
    }], { session });
  }

  return { batchId: batch._id, batchNo: batch.batchNo, qty, expiryDate: batch.expiryDate };
}

/**
 * When batch tracking is switched on for an item that already holds stock,
 * move that untracked stock into an OPENING batch so batch totals match
 * Item.qty from the start.
 */
async function openingBatchForExistingStock({ companyId, item, session }) {
  const tracked = await Batch.aggregate([
    { $match: { companyId: item.companyId, itemId: item._id } },
    { $group: { _id: null, total: { $sum: "$qtyRemaining" } } },
  ]).session(session || null);
  const untracked = item.qty - (tracked[0]?.total || 0);
  if (untracked <= 0) return null;

  return receiveIntoBatch({
    companyId, itemId: item._id, qty: untracked,
    fallbackBatchNo: "OPENING", warehouseId: item.warehouseId, session,
  });
}

module.exports = { receiveIntoBatch, openingBatchForExistingStock };
