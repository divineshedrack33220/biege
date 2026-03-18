const multer = require('multer');

   const storage = multer.memoryStorage();
   const upload = multer({
     storage,
     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
     fileFilter: (req, file, cb) => {
       if (!file.mimetype.startsWith('image/')) {
         return cb(new Error('File must be an image'), false);
       }
       cb(null, true);
     }
   });

   module.exports = upload;