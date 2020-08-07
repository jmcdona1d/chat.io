const fs = require('fs')
const usernameData = require('../assets/usernameData.json')

module.exports = {
    getUserName: function () {
        const index1 = Math.floor(Math.random() * 10000) % usernameData["names"].length;
        const index2 = Math.floor(Math.random() * 10000) % usernameData["animals"].length;

        return  usernameData["names"][index1] + " " +usernameData["animals"][index2];
    }
}