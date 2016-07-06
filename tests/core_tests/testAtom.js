/**
 * Created by zenit1 on 04/07/2016.
 */

var atomServices = new(require('../../src/core/AtomServices'))();
var devHostname = 'r16zxzdglf1q9g4t.v1.beameio.net';

atomServices.createAtom(devHostname,'flow',function(error,payload){
    if(!error){
        console.log(payload);

        atomServices.updateAtom(devHostname,payload.hostname,'flowUpd',function(error,payload){
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
