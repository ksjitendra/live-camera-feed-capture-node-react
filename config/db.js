const mongoose = require('mongoose');

const dbConnection = async () => {

    try {
        await mongoose.connect(process.env.MONGO_CONNECTION_STR)
    } catch (error) {
        console.log("Error in connection ", error.message);   
    }
}


module.exports = dbConnection
