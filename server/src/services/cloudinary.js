const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage for different file types
const propertyImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'camrent/properties',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    max_file_size: 5000000, // 5MB
    transformation: [
      { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
    ]
  }
});

const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'camrent/documents',
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
    max_file_size: 10000000, // 10MB
    resource_type: 'auto'
  }
});

const profileImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'camrent/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    max_file_size: 2000000, // 2MB
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }
    ]
  }
});

const propertyVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'camrent/property-videos',
    allowed_formats: ['mp4', 'mov', 'webm', 'm4v'],
    resource_type: 'video',
    transformation: [
      { duration: 120 }
    ]
  }
});

// Create upload middleware
const uploadPropertyImages = multer({
  storage: propertyImageStorage,
  limits: {
    fileSize: 5000000, // 5MB per file
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
  }
});

const uploadDocuments = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10000000, // 10MB per file
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG images and PDF documents are allowed.'), false);
    }
  }
});

const uploadProfileImage = multer({
  storage: profileImageStorage,
  limits: {
    fileSize: 2000000 // 2MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
  }
});

const uploadPropertyVideos = multer({
  storage: propertyVideoStorage,
  limits: {
    fileSize: 25000000,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, WEBM, and M4V videos are allowed.'), false);
    }
  }
});

// Helper function to delete files from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Helper function to extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?\.(?:jpg|jpeg|png|gif|pdf|mp4|mov|webm|m4v))/i);
  return matches ? matches[1] : null;
};

module.exports = {
  cloudinary,
  uploadPropertyImages,
  uploadPropertyVideos,
  uploadDocuments,
  uploadProfileImage,
  deleteFromCloudinary,
  getPublicIdFromUrl
};
