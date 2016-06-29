var os = require('os');
var beameApi = require('../src/collectAuthData.js');

beameApi.scanBeameDir(os.homedir()+'/.beame/',function(data){


    console.log("testttttt:" +JSON.stringify(data)); 
});
