const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Property = require('../models/Property');

dotenv.config();

async function fixBlobImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('✅ Connected to MongoDB');

    // Get all properties
    const properties = await Property.find();
    console.log(`Found ${properties.length} properties`);

    // Working placeholder image URLs
    const sampleImages = [
      'https://picsum.photos/800/600?random=10',
      'https://picsum.photos/800/600?random=11',
      'https://picsum.photos/800/600?random=12',
      'https://picsum.photos/800/600?random=13',
      'https://picsum.photos/800/600?random=14'
    ];

    let fixedCount = 0;

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      console.log(`\n🏠 Checking images for: ${property.title}`);
      
      // Check if any images are blob URLs
      const hasBlobUrls = property.images.some(img => img.url && img.url.startsWith('blob:'));
      
      if (hasBlobUrls) {
        console.log(`   Found blob URLs, fixing...`);
        
        // Replace blob URLs with proper placeholder URLs
        let updatedImages = [];
        const imageCount = property.images.length;
        
        for (let j = 0; j < Math.min(imageCount, 4); j++) {
          const imageUrl = sampleImages[j % sampleImages.length];
          updatedImages.push({
            name: `property-image-${j + 1}`,
            url: imageUrl,
            type: 'image/jpeg'
          });
          console.log(`   Image ${j + 1}: ${imageUrl}`);
        }
        
        // Update property with new images
        property.images = updatedImages;
        await property.save();
        
        console.log(`✅ Fixed ${property.title} - replaced blob URLs with working images`);
        fixedCount++;
      } else {
        console.log(`   No blob URLs found - images are OK`);
      }
    }

    console.log(`\n✅ Image fix complete! Fixed ${fixedCount} properties with blob URLs`);
    
  } catch (error) {
    console.error('❌ Error fixing blob images:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the fix
if (require.main === module) {
  fixBlobImages();
}

module.exports = { fixBlobImages };
