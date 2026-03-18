
   const mongoose = require('mongoose');
   const bcrypt = require('bcryptjs');
   const Admin = require('./models/Admin');
   const connectDB = require('./config/db');

   const resetAdminPassword = async () => {
     try {
       await connectDB();
       const username = 'admin';
       const newPassword = 'admin123';

       // Hash the new password
       const hashedPassword = await bcrypt.hash(newPassword, 10);

       // Update the admin user
       const result = await Admin.updateOne(
         { username },
         { $set: { password: hashedPassword } }
       );

       if (result.matchedCount === 0) {
         console.log('Admin user not found. Creating new admin...');
         await Admin.create({ username, password: newPassword });
       } else if (result.modifiedCount === 1) {
         console.log('Admin password updated successfully');
       } else {
         console.log('Admin password was already up to date');
       }

       mongoose.connection.close();
     } catch (error) {
       console.error('Error resetting admin password:', error);
       mongoose.connection.close();
     }
   };

   resetAdminPassword();
