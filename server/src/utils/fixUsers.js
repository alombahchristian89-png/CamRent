const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

async function fixUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camrent');
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create users with plain passwords (model will hash them automatically)
    const users = [
      {
        name: 'RENTAL ADMIN',
        email: 'keyadmin@camrent.com',
        password: 'TheDeveloperMail@1',
        role: 'admin',
        isVerified: true,
        verificationStatus: 'approved'
      },
      {
        name: 'PA LANDLORD',
        email: 'landlordmain@gmail.com',
        password: 'TheDeveloperMail@1',
        role: 'landlord',
        phone: '+237 123 456 789',
        isVerified: true,
        verificationStatus: 'approved',
        documents: [
          'https://res.cloudinary.com/demo/image/upload/sample_id.jpg',
          'https://res.cloudinary.com/demo/image/upload/sample_deed.pdf'
        ]
      },
      {
        name: 'TEST TERNANT',
        email: 'firstternant@gmail.com',
        password: 'TheDeveloperMail@1',
        role: 'tenant',
        phone: '+237 987 654 321'
      },
      {
        name: 'PENDING LANDLORD',
        email: 'pendinglandlord@gmail.com',
        password: 'TheDeveloperMail@1',
        role: 'landlord',
        phone: '+237 555 123 456',
        verificationStatus: 'pending',
        documents: [
          'https://res.cloudinary.com/demo/image/upload/pending_id.jpg',
          'https://res.cloudinary.com/demo/image/upload/pending_deed.pdf'
        ]
      }
    ];

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${user.name} (${user.email})`);
    }

    console.log('\n🎉 All users created successfully!');
    console.log('\n📧 Login Credentials:');
    console.log('Admin: keyadmin@camrent.com / TheDeveloperMail@1');
    console.log('Landlord: landlordmain@gmail.com / TheDeveloperMail@1');
    console.log('Tenant: firstternant@gmail.com / TheDeveloperMail@1');
    console.log('Pending: pendinglandlord@gmail.com / TheDeveloperMail@1');
    
  } catch (error) {
    console.error('❌ Error fixing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
if (require.main === module) {
  fixUsers();
}

module.exports = fixUsers;
