/**
 * Created by zenit1 on 17/07/2016.
 */
var chai = require('chai');
var assert = chai.assert;

var beameUtils = require('../../src/utils/BeameUtils');
var edgeServices = new (require('../../src/core/EdgeClientServices'))();

/**
 * CMD to run from console
 *  env edge_fqdn=[edge_fqdn] npm run test_edge
 **/


describe('Test Edge Client flow', function () {
    this.timeout(1000000);

    var atomHostname, edgeClientHostname, name, edgeClientDirPath;

    it('Atom fqdn should be passed',function(done){

        console.log('####### receive edge_fqdn');

        atomHostname  =  process.env.atom_fqdn;

        assert.isDefined(atomHostname,'Atom hostname required');
        assert.isNotNull(atomHostname,'Atom hostname required');

        console.log(atomHostname);

        done()
    });

    it('Should create edge', function (done) {

        var rnd = beameUtils.randomString(8);
        name = 'test-edge-' + rnd;

        console.log('############ creating edge %j for atom %j ############',name, atomHostname);


        edgeServices.createEdgeClient(atomHostname,function (error, payload) {

            console.log('############ create edge response received with payload %j and error %j ############',payload,error);

            //validate payload & error
            assert.isNull(error, error && error.message);
            assert.isNotNull(payload, error && error.message);

            //validate hostname
            edgeClientHostname = payload["hostname"];
            assert.isNotNull(edgeClientHostname, 'Atom hostname mismatch');


            //validate path
            edgeClientDirPath = beameUtils.findHostPathSync(edgeClientHostname);
            assert.isNotNull(edgeClientDirPath,"Atom directory not found");

            //validate certificate structure
            var certsCreated = beameUtils.validateHostCertsSync(edgeClientHostname,  global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
            assert.isTrue(certsCreated, 'Certificates mismatch');


            //validate metadata json
            var metadata = beameUtils.getHostMetadataSync(edgeClientHostname);
            assert.isNotNull(metadata, 'Metadata mismatch');

            assert.equal(metadata["hostname"], edgeClientHostname, 'Metadata hostname is incorrect');


            done()
        });

    });

    it('Should revoke edge certs', function (done) {

        console.log('############ revoking edge certs %j ############',edgeClientHostname);

        //validate pre-requisites
        assert.isNotNull(edgeClientHostname);
        assert.isNotNull(edgeClientDirPath);

        edgeServices.revokeCert(edgeClientHostname, function (error, payload) {

            console.log('############ revoke edge certs response received with payload %j and error %j ############',payload,error);

            //validate payload & error
            assert.isNull(error, error && error.message);
            assert.isNotNull(payload, error && error.message);

            done()

        });

    });

    it('Should renew edge certs', function (done) {

        console.log('############ renewing edge certs %j ############',edgeClientHostname);

        //validate pre-requisites
        assert.isNotNull(edgeClientHostname);
        assert.isNotNull(edgeClientDirPath);

        edgeServices.renewCert(edgeClientHostname, function (error, payload) {

            console.log('############ renew edge certs response received with payload %j and error %j ############',payload,error);

            //validate payload & error
            assert.isNull(error, error && error.message);
            assert.isNotNull(payload, error && error.message);

            //validate certificate structure
            var certsCreated = beameUtils.validateHostCertsSync(edgeClientHostname,  global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
            assert.isTrue(certsCreated, 'Certificates mismatch');

            done()

        });

    });

    it('Should bring edge stats', function (done) {

        console.log('############ bringing stats for edge  %j ############',edgeClientHostname);

        //validate pre-requisites
        assert.isNotNull(edgeClientHostname);

        edgeServices.getStats(edgeClientHostname, function (error, payload) {

            if(!error){
                console.log('############ bring stats edge stats ############');
                console.log(payload);
            }
            else{
                console.log('############ bring stats edge stats error %j ############',error);
            }

            //validate payload & error
            assert.isNull(error, error && error.message);
            assert.isNotNull(payload, error && error.message);

            //validate certificate structure
            var certsCreated = beameUtils.validateHostCertsSync(edgeClientHostname,  global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
            assert.isTrue(certsCreated, 'Certificates mismatch');

            done()

        });

    });

});