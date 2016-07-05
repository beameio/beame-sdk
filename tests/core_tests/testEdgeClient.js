/**
 * Created by zenit1 on 04/07/2016.
 */

var edgeClientServices = new(require('../../src/core/EdgeClientServices'))();
var devHostname = 'vrd63lna6efxpvqe.v1.beameio.net';
var appHostName = 'ycomcp8ys95w1o5y.vrd63lna6efxpvqe.v1.beameio.net';


edgeClientServices.createEdgeClient(devHostname,appHostName,function(error,payload){
    if(!error){
        console.log(payload);
    }
    else{
        console.error(error);
    }
});