
const userController = require("../models/userCordinates")

const saveRecord = (req, res) => {


    const recordObject = [
        {
            
                time: "1698055441836",
                latitude: "28.6031121",
                longitude: "77.3668853",
                connectionId: "sdfbw3229u43kjw"
        },
        {
            
            time: "1698055441836",
            latitude: "28.6031121",
            longitude: "77.3668853",
            connectionId: "sdfbw3229u43kjw"
        
        }

    ]

    res.status(200).json({
        message: "Getting here....!"
    })
}

module.exports = {saveRecord}

