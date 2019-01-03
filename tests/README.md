<img align="right" src="../img/beame.png">

# Beame SDK - tests

## cli_tests
Integration tests done using [NGS](https://github.com/ngs-lang/ngs)

## unit_tests
Unit tests for the internal functionality

Currently using the libraries:
-   [Mocha](https://mochajs.org/) - test framework
-   [simple-mock](https://github.com/jupiter/simple-mock) - Mock, stub and spies library

### test_commonutil.js
Tests the Common Utils.

### tests_credentials.js
Tests on the credentials functionality

Requires `BEAME_TESTS_TYPE` as one of the values: `flow`, `sign_and_create`, `local` or `local_custom`

Depending on the test it may use:
* `BEAME_TESTS_LOCAL_FQDN`
* `BEAME_TESTS_CUSTOM_FQDN`
* `BEAME_TESTS_SIGNING_FQDN`
* `BEAME_TESTS_TOKEN`
* `BEAME_TESTS_NAME`
* `BEAME_TESTS_SIGNED_FQDN`
* `BEAME_TESTS_DATA_TO_SIGN`

### test_ntp.js
Tests the ntp base functionality.

Uses `BEAME_TESTS_NTP_SERVER` (default "pool.ntp.org") and `BEAME_TESTS_NTP_SERVER_PORT` (default 123)

### test_ocsp.js
Tests in the oscp functionality

Requires `BEAME_TESTS_LOCAL_FQDN` (fqdn of a local available cred) in order to run the ocsp tests againts.

Sets internally `EXTERNAL_OCSP_FQDN` and `BEAME_THROW_OCSP` as required to test the functionality
