const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Property = require('../models/Property');
const Inquiry = require('../models/Inquiry');

dotenv.config();

async function testAdminStats() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('Connected to MongoDB');

    // Test the exact same queries as admin dashboard
    const [
      totalUsers,
      totalLandlords,
      pendingVerifications,
      totalProperties,
      totalInquiries
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'landlord', isActive: true }),
      User.countDocuments({ role: 'landlord', verificationStatus: 'pending' }),
      Property.countDocuments({ isActive: true }),
      Inquiry.countDocuments()
    ]);

    console.log('\n📊 Admin Dashboard Stats:');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Landlords: ${totalLandlords}`);
    console.log(`Pending Verifications: ${pendingVerifications}`);
    console.log(`Total Properties: ${totalProperties}`);
    console.log(`Total Inquiries: ${totalInquiries}`);

    // Check individual collections
    console.log('\n👥 All Users:');
    const allUsers = await User.find().select('name email role isActive verificationStatus');
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role} - Active: ${user.isActive} - Verification: ${user.verificationStatus}`);
    });

    console.log('\n🏠 All Properties:');
    const allProperties = await Property.find().select('title landlord isActive isApproved');
    allProperties.forEach(property => {
      console.log(`- ${property.title} - Active: ${property.isActive} - Approved: ${property.isApproved}`);
    });

    console.log('\n📨 All Inquiries:');
    const allInquiries = await Inquiry.find().select('status tenantId landlordId');
    console.log(`Total inquiries found: ${allInquiries.length}`);
    allInquiries.forEach(inquiry => {
      console.log(`- Status: ${inquiry.status} - Tenant: ${inquiry.tenantId} - Landlord: ${inquiry.landlordId}`);
    });

    // Test recent users query
    console.log('\n🕐 Recent Users (last 5):');
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt');
    recentUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role} - Created: ${user.createdAt}`);
    });

    // Test pending landlords query
    console.log('\n⏳ Pending Landlords:');
    const pendingLandlords = await User.find({ 
      role: 'landlord', 
      verificationStatus: 'pending' 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email documents createdAt');
    pendingLandlords.forEach(landlord => {
      console.log(`- ${landlord.name} (${landlord.email}) - Documents: ${landlord.documents?.length || 0} - Created: ${landlord.createdAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing admin stats:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
if (require.main === module) {
  testAdminStats();
}

module.exports = testAdminStats;
