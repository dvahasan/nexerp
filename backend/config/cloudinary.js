const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {string} folder
 * @returns {Promise<import("cloudinary").UploadApiResponse>}
 */
function uploadToCloudinary(buffer, folder = "nexinv") {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (err, result) => (err ? reject(err) : resolve(result))
    ).end(buffer);
  });
}

module.exports = { cloudinary, uploadToCloudinary };
