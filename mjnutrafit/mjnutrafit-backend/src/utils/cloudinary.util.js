const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");
require("dotenv").config();

const cloudinaryConfig = !process.env.CLOUDINARY_URL
  ? {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    }
  : { secure: true };

cloudinary.config(cloudinaryConfig);

const uploadImage = async (
  fileBuffer,
  folder = "mjnutrafit/profile-pictures",
  publicId
) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve({
          url: result.url,
          public_id: result.public_id,
          secure_url: result.secure_url,
        });
      }
    );
    const readableStream = Readable.from(fileBuffer);
    readableStream.pipe(uploadStream);
  });
};

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
  }
};

const extractPublicIdFromUrl = (url) => {
  try {
    const urlParts = url.split("/");
    const filename = urlParts[urlParts.length - 1];
    const publicId = filename.split(".")[0];
    const folderIndex = urlParts.findIndex((part) => part === "mjnutrafit");
    if (folderIndex !== -1) {
      const folderPath = urlParts.slice(folderIndex + 1, -1).join("/");
      return folderPath ? `${folderPath}/${publicId}` : publicId;
    }
    return publicId;
  } catch (error) {
    return null;
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  extractPublicIdFromUrl,
  cloudinary,
};
