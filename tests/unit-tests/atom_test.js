/**
 * Created by zenit1 on 17/07/2016.
 */
var chai = require('chai');
var assert = chai.assert;

var beameUtils = require('../../src/utils/BeameUtils');
var atomServices = new (require('../../src/core/AtomServices'))();

/**
 * CMD to run from console
 *  env developer_fqdn=[developer_fqdn] npm run test_atom
 **/


describe('Test Atom flow', function () {
    this.timeout(1000000);

    var developerHostname,atomHostName, name, atomDirPath;

    it('Developer fqdn should be passed',function(done){

        console.log('####### receive developer_fqdn');

        developerHostname  =  process.env.developer_fqdn;

        assert.isDefined(developerHostname,'Developer hostname required');
        assert.isNotNull(developerHostname,'Developer hostname required');

        console.log(developerHostname);

        done()
    });

    it('Should create atom', function (done) {

        var rnd = beameUtils.randomString(8);
        name = 'test-atom-' + rnd;

        console.log('############ creating atom %j for developer %j ############',name, developerHostname);


        atomServices.createAtom(developerHostname,name, function (error, payload) {

            console.log('############ create atom response received with payload %j and error %j ############',payload,error);

            //validate payload & error
            assert.isNull(error, error && error.message);
            assert.isNotNull(payload, error && error.message);

            //validate hostname
            atomHostName = payload["hostname"];
            assert.isNotNull(atomHostName, 'Developer hostname mismatch');


            //validate path
            atomDirPath = beameUtils.findHostPathSync(atomHostName);
            assert.isNotNull(atomDirPath,"Developer directory not found");

            //validate certificate structure
            var certsCreated = beameUtils.validateHostCertsSync(atomHostName,  global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
            assert.isTrue(certsCreated, 'Certificates mismatch');


            //validate metadata json
            var metadata = beameUtils.getHostMetadataSync(atomHostName);
            assert.isNotNull(metadata, 'Metadata mismatch');

            assert.equal(metadata["hostname"], atomHostName, 'Metadata hostname is incorrect');


            done()
        });

    });

    it('Should update atom', function (done) {

        var rnd = beameUtils.randomString(4);
        name += ('-' + rnd);

        console.log('############ updating atom profile %j ############',name);

        //validate pre-requisites
        assert.isNotNull(atomHostName);

        atomServices.updateAtom(atomHostName,name, function (error, payload) {

            console.log('############ update atom profile response received with payload %j and error %j ############',payload,error);

            //validate payload & error
            assert.isNull(error, error && error.message);
            assert.isNotNull(payload, error && error.message);

            done()

        });

    });

    it('Should revoke atom certs', function (done) {

        console.log('############ revoking atom certs %j ############',atomHostName);

        //validate pre-requisites
        assert.isNotNull(atomHostName);
        assert.isNotNull(atomDirPath);

        atomServices.revokeCert(atomHostName, function (error, payload) {

            console.log('############ revoke atom certs response received with payload %j and error %j ############',payload,error);

            //validate payload & error
            assert.isNull(error, error && error.message);
            assert.isNotNull(payload, error && error.message);

            done()

        });

    });

    it('Should renew atom certs', function (done) {

        console.log('############ renewing atom certs %j ############',atomHostName);

        //validate pre-requisites
        assert.isNotNull(atomHostName);
        assert.isNotNull(atomDirPath);

        atomServices.renewCert(atomHostName, function (error, payload) {

            console.log('############ renew atom certs response received with payload %j and error %j ############',payload,error);

            //validate payload & error
            assert.isNull(error, error && error.message);
            assert.isNotNull(payload, error && error.message);

            //validate certificate structure
            var certsCreated = beameUtils.validateHostCertsSync(atomHostName,  global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
            assert.isTrue(certsCreated, 'Certificates mismatch');

            done()

        });

    });

    it('Should bring atom stats', function (done) {

        console.log('############ bringing stats for atom  %j ############',atomHostName);

        //validate pre-requisites
        assert.isNotNull(atomHostName);

        atomServices.getStats(atomHostName, function (error, payload) {

            if(!error){
                console.log('############ bring stats atom stats ############');
                console.log(payload);
            }
            else{
                console.log('############ bring stats atom stats error %j ############',error);
            }

            //validate payload & error
            assert.isNull(error, error && error.message);
            assert.isNotNull(payload, error && error.message);

            //validate certificate structure
            var certsCreated = beameUtils.validateHostCertsSync(atomHostName,  global.ResponseKeys.NodeFiles, global.AppModules.UnitTest);
            assert.isTrue(certsCreated, 'Certificates mismatch');

            done()

        });

    });

});