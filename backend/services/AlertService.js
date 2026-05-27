const { Alert, Item } = require("../models");
const { broadcast } = require("../utils/broadcast");

class AlertService {
  /**
   * Checks the new quantity of an item against its thresholds and generates/resolves alerts.
   * @param {Object} item The fully loaded or recently updated Item document.
   * @param {mongoose.ClientSession} session (Optional)
   */
  static async checkStockAndAlert(item, session = null) {
    if (!item) return;

    try {
      const companyId = item.companyId;
      const itemId = item._id;
      const qty = item.qty;
      const minThreshold = item.minThreshold || 0;
      const reorderPoint = item.reorderPoint || 0;

      // 1. Check for Out of Stock
      if (qty <= 0) {
        await this._createOrUpdateAlert({
          companyId,
          itemId,
          type: "out_of_stock",
          severity: "critical",
          message: `Item out of stock: ${item.name}`,
          session
        });
      } else {
        await this._resolveAlerts(companyId, itemId, "out_of_stock", session);
      }

      // 2. Check for Low Stock (below minThreshold, but greater than 0)
      if (qty > 0 && qty <= minThreshold) {
        await this._createOrUpdateAlert({
          companyId,
          itemId,
          type: "low_stock",
          severity: "warning",
          message: `Item reached minimum threshold: ${item.name} (Qty: ${qty})`,
          session
        });
      } else if (qty > minThreshold) {
        await this._resolveAlerts(companyId, itemId, "low_stock", session);
      }

    } catch (err) {
      console.error("AlertService checkStockAndAlert error:", err);
    }
  }

  static async _createOrUpdateAlert(data) {
    const { companyId, itemId, type, severity, message, session } = data;

    // Check if an open alert of this type already exists for this item
    const existing = await Alert.findOne({ companyId, itemId, type, status: { $in: ["open", "acknowledged"] } }).session(session);
    
    if (existing) {
      // If severity or message changed, update it
      if (existing.message !== message || existing.severity !== severity) {
        existing.message = message;
        existing.severity = severity;
        await existing.save({ session });
        broadcast({ user: { companyId } }, "alert_updated", existing);
      }
      return;
    }

    // Create new alert
    const newAlert = new Alert({ companyId, itemId, type, severity, message });
    await newAlert.save({ session });
    
    broadcast({ user: { companyId } }, "alert_created", newAlert);
  }

  static async _resolveAlerts(companyId, itemId, type, session) {
    const alerts = await Alert.find({ companyId, itemId, type, status: { $in: ["open", "acknowledged"] } }).session(session);
    
    for (const alert of alerts) {
      alert.status = "resolved";
      alert.resolvedAt = new Date();
      await alert.save({ session });
      broadcast({ user: { companyId } }, "alert_resolved", alert);
    }
  }
}

module.exports = AlertService;
