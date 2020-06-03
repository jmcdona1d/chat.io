const fs = require('fs')
const usernameData = require('../assets/usernameData.json')

module.exports = {
    getUserName: function () {
        const index = Math.floor(Math.random() * 10000) % usernameData["names"].length
        return "user " + usernameData["names"][index]

    }
}