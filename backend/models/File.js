const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    companyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    itemId:       { type: mongoose.Schema.Types.ObjectId, ref: "Item",    required: false },
    uploaderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    name:         { type: String, required: true },
    url:          { type: String, required: true },
    type:         { type: String, required: true },
    size:         { type: Number, required: true },
    cloudinaryId: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("File", FileSchema);
