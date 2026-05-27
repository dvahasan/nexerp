const mongoose = require("mongoose");

const ReservationSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    itemId:      { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    qty:         { type: Number, required: true, min: 1 },
    
    sourceType:  { type: String, enum: ["order", "pos", "manual"], default: "manual" },
    sourceId:    { type: String, default: "" }, // E.g., an external Order ID
    
    status:      { type: String, enum: ["active", "fulfilled", "released", "expired"], default: "active" },
    expiresAt:   { type: Date, default: null },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

ReservationSchema.index({ companyId: 1, itemId: 1, status: 1 });
ReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index if expiresAt is used

module.exports = mongoose.model("Reservation", ReservationSchema);
