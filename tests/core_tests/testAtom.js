/**
 * Created by zenit1 on 04/07/2016.
 */

var atomServices = new(require('../../src/core/AtomServices'))();
var devHostname = 'ytbahyw8h5q73ozo.v1.beameio.net';

atomServices.createAtom(devHostname,'atom1',function(error,payload){
    if(!error){
        console.log(payload);

        // atomServices.updateAtom(devHostname,payload.hostname,'atom1-upd',function(error,payload){
        //     if(!error){
        //         console.log(payload);
        //     }
        //     else{
        //         console.error(error);
        //     }
        // });
    }
    else{
        console.error(error);
    }
});
