Beige Model Agency Web App
A Node.js web application for Beige Model Agency with a frontend styled using Tailwind CSS and a backend powered by MongoDB Atlas. Includes an admin control panel for managing models, team members, gallery images, and newsletter subscribers.
Prerequisites

Node.js (v16 or higher)
MongoDB Atlas account
npm

Setup

Clone the repository:
git clone <repository-url>
cd model-agency


Install dependencies:
npm install


Create a .env file in the root directory with the following:
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/model-agency?retryWrites=true&w=majority
PORT=3000
JWT_SECRET=<your_jwt_secret_key>


Replace <username>, <password>, and <cluster-name> with your MongoDB Atlas credentials.
Generate a secure JWT_SECRET (e.g., node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").


Start the server:
npm start

Or, for development with auto-restart:
npm run dev


Access the app:

Frontend: http://localhost:3000
Admin CPanel: http://localhost:3000/admin.html



Admin Setup

Create an admin user in MongoDB Atlas:

Connect to your MongoDB Atlas database.
Insert an admin document in the admins collection:{
  username: "admin",
  password: "<hashed_password>",
  createdAt: new Date()
}

Use a tool like bcrypt to hash the password:const bcrypt = require('bcrypt');
bcrypt.hash('your_password', 10).then(hash => console.log(hash));




Add sample data to MongoDB Atlas:

Models (models collection):[
  { name: "Alexandra", category: "fashion", imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b", description: "Fashion Model" },
  { name: "James", category: "runway", imageUrl: "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93", description: "Runway Model" }
]


Team Members (teamMembers collection):[
  { name: "Jane Doe", role: "Creative Director", imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330", description: "Leading innovative campaigns." },
  { name: "John Smith", role: "Talent Manager", imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e", description: "Guiding our models." }
]


Gallery Images (galleryImages collection):[
  { title: "Campaign 1", imageUrl: "https://images.unsplash.com/photo-1524504388940-b4f3978812a0", campaignLink: "https://example.com/campaign1" },
  { title: "Campaign 2", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f" }
]




Log in to the admin CPanel at /admin.html with the username and password.


Features

Public Pages:
Homepage (index.html): Displays featured models and newsletter subscription.
Models (models.html): Lists models with category and name filters, infinite scroll.
About (about.html): Displays agency info, team members, and gallery images.
Become a Model (become-model.html): Placeholder for model application.
Booking (booking.html): Placeholder for booking form.


Admin CPanel (admin.html):
Login with JWT authentication.
Manage models, team members, and gallery images (create, read, update, delete).
View newsletter subscribers.


Backend:
Node.js/Express with MongoDB Atlas.
REST API for models, team members, gallery images, and newsletter subscriptions.
JWT-based authentication for admin routes.



Notes

Ensure image URLs in the database are valid and accessible.
The models.html page links to individual model pages (/model.html?id=<id>). Implement these pages or adjust links as needed.
Add actual images to the /public/assets/images/ directory or use external URLs in the database.
