const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
};

const getProfilePhotoUrl = ({
  file,
  cloudinaryConfigured,
  cloudinaryUrl,
  baseUrl,
}) => {
  // -------------------------------------------------------
  // CLOUDINARY
  // -------------------------------------------------------

  if (cloudinaryConfigured && cloudinaryUrl) {
    return cloudinaryUrl;
  }

  // -------------------------------------------------------
  // LOCAL / FALLBACK UPLOAD
  // -------------------------------------------------------

  const normalizedBaseUrl = (
    baseUrl || "http://localhost:5000"
  ).replace(/\/$/, "");

  const relativePath = file?.path
    ? file.path.replace(/\\/g, "/")
    : "";

  if (!relativePath) {
    return "";
  }

  const normalizedPath = relativePath.startsWith("/")
    ? relativePath
    : `/${relativePath}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
};

module.exports = {
  isCloudinaryConfigured,
  getProfilePhotoUrl,
};