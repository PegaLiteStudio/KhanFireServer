const jwt = require('jsonwebtoken');

const getJWT = (number, pass, deviceID) => {
    let data = {
        time: Date(), number, pass, deviceID
    }

    let jwtSecretKey = process.env.JWT_SECRET_KEY;
    return jwt.sign(data, jwtSecretKey, {
        expiresIn: "7d"
    });
}


module.exports = {
    getJWT
}