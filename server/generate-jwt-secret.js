const crypto = require('crypto');

// Generate a secure JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('Generated JWT Secret:');
console.log(jwtSecret);
console.log('');
console.log('Copy this secret to your .env file:');
console.log(`JWT_SECRET=${jwtSecret}`);
