<img align="right" src="../img/beame.png">

# Beame SDK - tests

`BEAME_ENV=dev` to run tests against dev environment

`BEAME_ENV=prod` to run tests against prod environment

## cli_tests

Integration tests done using [NGS](https://github.com/ngs-lang/ngs)

## unit_tests

Unit tests for the internal functionality

Currently using the libraries:
-   [Mocha](https://mochajs.org/) - test framework
-   [simple-mock](https://github.com/jupiter/simple-mock) - Mock, stub and spies library

Mocha can be called from `./node-modules/.bin/mocha`

### test_commonutil.js
Tests the Common Utils.

### tests_credentials.js
Tests on the credentials functionality

Requires `BEAME_TESTS_LOCAL_ROOT_FQDN` (fqdn of a local root available cred)

### tests_custom_credentials.js (requires special credentials)
Tests on the creation of custom credentials.
This test requires a special level of credentials

Requires `BEAME_TESTS_LOCAL_ROOT_FQDN` (fqdn of a local root available cred)
Optionally `BEAME_TESTS_CUSTOM_FQDN` can be passed for a custom fqdn creation in the custom fqdn test.

### test_ntp.js
Tests the ntp base functionality.

* Uses `BEAME_TESTS_NTP_SERVER` (default "pool.ntp.org") and `BEAME_TESTS_NTP_SERVER_PORT` (default 123)
* Uses `BEAME_TEST_NTP_RANGE` (default 10) - acceptable NTP time difference

### test_ocsp.js
Tests in the oscp functionality

Requires `BEAME_TESTS_LOCAL_FQDN` (fqdn of a local available cred) in order to run the ocsp tests againts.

Sets internally `EXTERNAL_OCSP_FQDN` and `BEAME_OCSP_IGNORE` as required to test the functionality

## Running examples

From the tests folder run:

`BEAME_TESTS_LOCAL_ROOT_FQDN=jadtndigzadmevz7.v1.d.beameio.net BEAME_ENV=dev ../node_modules/mocha/bin/mocha unit_tests/test_credentials.js`

`BEAME_TESTS_LOCAL_FQDN=jadtndigzadmevz7.v1.d.beameio.net BEAME_ENV=dev ../node_modules/mocha/bin/mocha unit_tests/test_ocsp.js`


For debugging information on the tests, add the `DEBUG=beame:sdk:unittests:*`

In production environment, just use a `.p.beameio.net` credential and remove the `BEAME_ENV=dev`.