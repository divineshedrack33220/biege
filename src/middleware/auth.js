const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    console.log('Received Authorization header:', authHeader); // Debug header
    if (!authHeader) {
        console.log('No Authorization header provided');
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token:', token); // Debug extracted token
    if (!token) {
        console.log('No token provided in Authorization header');
        return res.status(401).json({ message: 'No token provided' });
    }

    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded:', decoded);
        req.adminId = decoded.id;
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token format or signature' });
        } else {
            return res.status(401).json({ message: 'Token verification failed', error: error.message });
        }
    }
};

module.exports = authMiddleware;