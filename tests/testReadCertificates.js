var os = require('os');
 var beameApi = require('../src/services/BeameDirServices.js');

 beameApi.scanBeameDir(os.homedir()+'/.beame/',function(data){


	    console.log(JSON.stringify(data)); 
 });
