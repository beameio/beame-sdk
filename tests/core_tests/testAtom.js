/**
 * Created by zenit1 on 04/07/2016.
 */

var atomServices = new(require('../../src/core/AtomServices'))();
var devHostname = 'fsxby2p8u6lkfoj2.v1.beameio.net';

atomServices.createAtom(devHostname,'appa-ahuyapa',function(error,payload){
    if(!error){
        console.log(payload);

        atomServices.updateAtom(devHostname,payload.hostname,'appa_ahhuyappa-upd',function(error,payload){
            if(!error){
                console.log(payload);
            }
            else{
                console.error(error);
            }
        });
    }
    else{
        console.error(error);
    }
});
