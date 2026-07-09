const express = require('express');
const router = express.Router();
const { protect, authorize, isVerifiedLandlord } = require('../middleware/auth');
const { 
  uploadPropertyImages, 
  uploadPropertyVideos,
  uploadDocuments, 
  uploadProfileImage,
  deleteFromCloudinary,
  getPublicIdFromUrl
} = require('../services/cloudinary');

// Upload property images
router.post('/property-images', 
  protect, 
  authorize('landlord'), 
  isVerifiedLandlord, 
  uploadPropertyImages.array('images', 10), 
  (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const imageUrls = req.files.map(file => file.path);
      
      res.json({
        success: true,
        message: 'Images uploaded successfully',
        data: {
          images: imageUrls
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload images'
      });
    }
  }
);

router.post('/property-videos',
  protect,
  authorize('landlord'),
  isVerifiedLandlord,
  uploadPropertyVideos.array('videos', 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const videoUrls = req.files.map((file) => file.path);

      res.json({
        success: true,
        message: 'Videos uploaded successfully',
        data: {
          videos: videoUrls
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload videos'
      });
    }
  }
);

// Upload verification documents
router.post('/documents', 
  protect, 
  authorize('landlord'), 
  uploadDocuments.array('documents', 5), 
  (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const documentUrls = req.files.map(file => file.path);
      
      res.json({
        success: true,
        message: 'Documents uploaded successfully',
        data: {
          documents: documentUrls
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload documents'
      });
    }
  }
);

// Upload profile image
router.post('/profile-image', 
  protect, 
  uploadProfileImage.single('image'), 
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      res.json({
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          profileImage: req.file.path
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile image'
      });
    }
  }
);

// Delete file from Cloudinary
router.delete('/file', protect, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'File URL is required'
      });
    }

    const publicId = getPublicIdFromUrl(url);
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file URL'
      });
    }

    // Determine resource type based on file extension
    const normalizedUrl = url.toLowerCase();
    const isRawFile = normalizedUrl.includes('.pdf');
    const isVideoFile = /\.(mp4|mov|webm|m4v)(\?|$)/.test(normalizedUrl);
    const resourceType = isRawFile ? 'raw' : isVideoFile ? 'video' : 'image';
    
    await deleteFromCloudinary(publicId, resourceType);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

module.exports = router;
