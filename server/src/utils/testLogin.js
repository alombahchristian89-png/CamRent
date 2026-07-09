const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

async function testLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('Connected to MongoDB');

    // Test users
    const testUsers = [
      { email: 'keyadmin@camrent.com', password: 'TheDeveloperMail@1' },
      { email: 'landlordmain@gmail.com', password: 'TheDeveloperMail@1' },
      { email: 'firstternant@gmail.com', password: 'TheDeveloperMail@1' }
    ];

    for (const testUser of testUsers) {
      console.log(`\n🔍 Testing user: ${testUser.email}`);
      
      // Find user
      const user = await User.findOne({ email: testUser.email });
      if (!user) {
        console.log(`❌ User not found: ${testUser.email}`);
        continue;
      }

      console.log(`✅ User found: ${user.name}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔑 Role: ${user.role}`);
      console.log(`📊 Active: ${user.isActive}`);
      console.log(`🔐 Verification Status: ${user.verificationStatus}`);

      // Test password comparison
      const isPasswordValid = await user.comparePassword(testUser.password);
      console.log(`🔒 Password Valid: ${isPasswordValid}`);

      if (!isPasswordValid) {
        console.log(`⚠️  Password mismatch. Testing manual comparison...`);
        
        // Test with manual bcrypt
        const manualCheck = await bcrypt.compare(testUser.password, user.password);
        console.log(`🔒 Manual bcrypt check: ${manualCheck}`);
      }
    }

    // List all users in database
    console.log('\n📋 All users in database:');
    const allUsers = await User.find().select('name email role isActive verificationStatus');
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role} - Active: ${user.isActive}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing login:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
if (require.main === module) {
  testLogin();
}

module.exports = testLogin;
