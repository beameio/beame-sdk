/**
 * Created by zenit1 on 17/07/2016.
 */
var mocha = require('mocha');
var chai = require('chai');
//var expect = chai.expect;
var assert = chai.assert;

var developerServices = new (require('../../src/core/DeveloperServices'))();


function randomString(length) {
    var chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890";
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

describe('Test Developer flow', function () {
    this.timeout(100000);



    describe('Creating developer', function () {
        var name, email;


        it('Developer Created', function () {

            var rnd = randomString(8);
            name = 'test-developer-' + rnd;
            email = name + '@beame.io';

            developerServices.createDeveloper(name, email, function (error, payload) {
                assert.isNull(error, error && error.message);
                assert.isNotNull(payload, error && error.message);
                assert.equal(payload["email"], email, 'Response email is incorrect');
                assert.equal(payload["name"], name, 'Response name is incorrect');
            });

        });

    });

});