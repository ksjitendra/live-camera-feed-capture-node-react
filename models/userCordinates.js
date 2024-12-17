
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userCordinatesSchema = new Schema({

    user_connection_id: String, 
    current_time: String,
    latitude: String, 
    longitude: String
}, { timestamps: true })

module.exports = mongoose.model('user_cordinates', userCordinatesSchema)

