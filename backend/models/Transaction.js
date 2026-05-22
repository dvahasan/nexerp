const mongoose = require("mongoose");

const TxSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    type:      { type: String, enum: ["IN","OUT"], required: true },
    itemId:    { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    qty:       { type: Number, required: true, min: 1 },
    source:    String,
    dest:      String,
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName:  String,
    date:      { type: Date, default: Date.now },
    notes:     String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", TxSchema);
