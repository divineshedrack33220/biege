const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Model = require('./models/Model');
const Admin = require('./models/Admin');
const Booking = require('./models/Booking');
const connectDB = require('./config/db');
require('dotenv').config();

const seedData = async () => {
  await connectDB();

  // Seed Models
  const models = [
    { name: 'ALEXANDRA', category: 'fashion', imageUrl: 'https://images.unsplash.com/photo-1519741497674-411a16a1f0d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80' },
    { name: 'JAMES', category: 'fashion', imageUrl: 'https://images.unsplash.com/photo-1519741497674-411a16a1f0d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80' },
    { name: 'SOFIA', category: 'commercial', imageUrl: 'https://images.unsplash.com/photo-1519741497674-411a16a1f0d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80' },
    { name: 'MARCUS', category: 'commercial', imageUrl: 'https://images.unsplash.com/photo-1519741497674-411a16a1f0d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80' },
    { name: 'LENA', category: 'editorial', imageUrl: 'https://images.unsplash.com/photo-1519741497674-411a16a1f0d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80' },
    { name: 'DANIEL', category: 'fashion', imageUrl: 'https://images.unsplash.com/photo-1519741497674-411a16a1f0d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80' },
  ];

  await Model.deleteMany({});
  await Model.insertMany(models);

  // Seed Admin
  const admin = {
    username: 'admin',
    password: await bcrypt.hash('admin123', 10),
  };

  await Admin.deleteMany({});
  await Admin.create(admin);

  // Seed Bookings
  const bookings = [
    {
      fullName: 'Emma Thompson',
      email: 'emma.thompson@example.com',
      phone: '+1-555-123-4567',
      shootType: 'fashion',
      modelDetails: 'Requesting ALEXANDRA for a fashion campaign',
      bookingDateTime: new Date('2025-08-15T10:00:00Z'),
      location: {
        address: '123 Fashion St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
      },
      additionalNote: 'Need high-resolution images for print',
      contactMethod: 'Email',
      status: 'pending',
    },
    {
      fullName: 'Liam Carter',
      email: 'liam.carter@example.com',
      phone: '+1-555-987-6543',
      shootType: 'commercial',
      modelDetails: 'Requesting SOFIA for a TV ad',
      bookingDateTime: new Date('2025-08-20T14:00:00Z'),
      location: {
        address: '456 Media Ave',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
      },
      additionalNote: 'Outdoor shoot, sunny weather preferred',
      contactMethod: 'Phone',
      status: 'reviewed',
    },
    {
      fullName: 'Sophie Nguyen',
      email: 'sophie.nguyen@example.com',
      phone: '+44-20-1234-5678',
      shootType: 'editorial',
      modelDetails: 'Requesting LENA for a magazine spread',
      bookingDateTime: new Date('2025-09-01T09:00:00Z'),
      location: {
        address: '789 Studio Rd',
        city: 'London',
        state: 'London', // ← Fixed: added required `state`
        country: 'UK',
      },
      additionalNote: 'Studio lighting setup required',
      contactMethod: 'Email',
      status: 'confirmed',
    },
  ];

  await Booking.deleteMany({});
  await Booking.insertMany(bookings);

  console.log('Data seeded to MongoDB Atlas');
  process.exit();
};

seedData();
