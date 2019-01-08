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

Requires `BEAME_TESTS_LOCAL_ROOT_FQDN` (fqdn of a local root available cred)
Optionally `BEAME_TESTS_CUSTOM_FQDN` can be passed for a custom fqdn creation in the custom fqdn test.

### test_ntp.js
Tests the ntp base functionality.

Uses `BEAME_TESTS_NTP_SERVER` (default "pool.ntp.org") and `BEAME_TESTS_NTP_SERVER_PORT` (default 123)

### test_ocsp.js
Tests in the oscp functionality

Requires `BEAME_TESTS_LOCAL_FQDN` (fqdn of a local available cred) in order to run the ocsp tests againts.

Sets internally `EXTERNAL_OCSP_FQDN` and `BEAME_THROW_OCSP` as required to test the functionality
