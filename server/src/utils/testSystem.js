const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

dotenv.config();

async function testCloudinaryConnection() {
  console.log('🔧 Testing Cloudinary Connection...');
  
  try {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    console.log('✅ Cloudinary configured with:');
    console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   API Secret: ${process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'}`);
    
    // Test API connection
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary API connection successful!');
    console.log(`   Status: ${result.status}`);
    
    // Test folder structure
    try {
      const folders = await cloudinary.api.sub_folders('camrent');
      console.log('✅ Existing CAMRENT folders:', folders.folders.map(f => f.name));
    } catch (folderError) {
      console.log('ℹ️  CAMRENT folder structure will be created on first upload');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testPropertyDetails() {
  console.log('\n🏠 Testing Property Details Retrieval...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('✅ Connected to MongoDB');
    
    // Get all properties
    const properties = await Property.find().populate('landlord', 'name email phone');
    console.log(`✅ Found ${properties.length} properties in database`);
    
    if (properties.length === 0) {
      console.log('❌ No properties found. Please run the property insertion script first.');
      return { success: false, error: 'No properties found' };
    }
    
    // Test property details for each property
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      console.log(`\n📋 Property ${i + 1}: ${property.title}`);
      console.log(`   ID: ${property._id}`);
      console.log(`   Price: ${property.price} XAF/month`);
      console.log(`   Location: ${property.location.city}, ${property.location.address}`);
      console.log(`   Type: ${property.propertyType}`);
      console.log(`   Bedrooms: ${property.bedrooms}`);
      console.log(`   Bathrooms: ${property.bathrooms}`);
      console.log(`   Area: ${property.area} m²`);
      console.log(`   Images: ${property.images.length} images`);
      console.log(`   Amenities: ${property.amenities.length} amenities`);
      console.log(`   Landlord: ${property.landlord.name} (${property.landlord.email})`);
      console.log(`   Active: ${property.isActive}`);
      console.log(`   Approved: ${property.isApproved}`);
      
      // Check images
      if (property.images.length > 0) {
        console.log(`   Sample image URL: ${property.images[0]}`);
      }
      
      // Check amenities
      if (property.amenities.length > 0) {
        console.log(`   Amenities: ${property.amenities.join(', ')}`);
      }
    }
    
    // Test property by ID retrieval (simulating API call)
    const firstProperty = properties[0];
    const propertyById = await Property.findById(firstProperty._id).populate('landlord', 'name email phone');
    
    if (propertyById) {
      console.log('\n✅ Property retrieval by ID successful');
      console.log(`   Retrieved: ${propertyById.title}`);
    } else {
      console.log('\n❌ Property retrieval by ID failed');
      return { success: false, error: 'Property retrieval by ID failed' };
    }
    
    return { success: true, properties: properties.map(p => ({
      id: p._id,
      title: p.title,
      price: p.price,
      location: p.location,
      images: p.images,
      landlord: p.landlord.name
    })) };
  } catch (error) {
    console.error('❌ Property details test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

async function testAPIEndpoints() {
  console.log('\n🌐 Testing API Endpoints...');
  
  const baseUrl = 'http://localhost:5000/api';
  
  try {
    // Test properties endpoint
    const propertiesResponse = await fetch(`${baseUrl}/properties`);
    if (propertiesResponse.ok) {
      const propertiesData = await propertiesResponse.json();
      console.log('✅ GET /api/properties - Working');
      console.log(`   Returned ${propertiesData.data?.properties?.length || 0} properties`);
    } else {
      console.log('❌ GET /api/properties - Failed');
    }
    
    // Test property detail endpoint (using first property ID)
    const propertyId = '6621a9b8c9e7c8a3e4f5a6b1'; // Sample ID, will be updated dynamically
    const detailResponse = await fetch(`${baseUrl}/properties/${propertyId}`);
    if (detailResponse.ok) {
      console.log('✅ GET /api/properties/:id - Working');
    } else {
      console.log(`❌ GET /api/properties/:id - Failed (${detailResponse.status})`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ API endpoint test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runSystemTests() {
  console.log('🚀 CAMRENT System Health Check\n');
  
  const results = {
    cloudinary: await testCloudinaryConnection(),
    properties: await testPropertyDetails(),
    api: await testAPIEndpoints()
  };
  
  console.log('\n📊 System Health Summary:');
  console.log(`Cloudinary: ${results.cloudinary.success ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Properties: ${results.properties.success ? '✅ OK' : '❌ FAILED'}`);
  console.log(`API: ${results.api.success ? '✅ OK' : '❌ FAILED'}`);
  
  if (results.properties.success && results.properties.properties) {
    console.log('\n🏠 Available Properties for Testing:');
    results.properties.properties.forEach((prop, index) => {
      console.log(`${index + 1}. ${prop.title} (ID: ${prop.id})`);
      console.log(`   Price: ${prop.price} XAF/month`);
      console.log(`   Location: ${prop.location.city}`);
      console.log(`   Images: ${prop.images.length}`);
    });
  }
  
  console.log('\n🎯 Test URLs:');
  console.log('Property List: http://localhost:3000/properties');
  console.log('Property Detail: http://localhost:3000/properties/[property-id]');
  console.log('Admin Dashboard: http://localhost:3000/admin/dashboard');
  
  return results;
}

// Run the tests
if (require.main === module) {
  runSystemTests();
}

module.exports = { testCloudinaryConnection, testPropertyDetails, testAPIEndpoints, runSystemTests };
