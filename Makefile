default:
	exit 1

build:
	npm install

clean:
	rm -rf node_modules

printunittestenv:
	@echo
	@echo "Running with:"
	@echo "  BEAME_ENV=${BEAME_ENV}"
	@echo "  BEAME_TESTS_CREDS_FQDN=${BEAME_TESTS_CREDS_FQDN}"
	@echo "  BEAME_TESTS_ROOT_CREDS_FQDN=${BEAME_TESTS_ROOT_CREDS_FQDN}"
	@echo "  BEAME_INTERNAL_AUTH_SERVER_FQDN=${BEAME_INTERNAL_AUTH_SERVER_FQDN}"
	@echo

clitests: printunittestenv
ifndef BEAME_ENV
	$(error BEAME_ENV is undefined)
endif
ifndef BEAME_TESTS_ROOT_CREDS_FQDN
	$(error BEAME_TESTS_ROOT_CREDS_FQDN is undefined)
endif
	rm -rf /tmp/tests/
	mkdir /tmp/tests
	cp -R ~/.beame/v2/$$BEAME_TESTS_ROOT_CREDS_FQDN /tmp/tests/
	(cd tests/cli_tests && HOME=/tmp/tests ./testAll.ngs)

unittests: printunittestenv
ifndef BEAME_ENV
	$(error BEAME_ENV is undefined)
endif
ifndef BEAME_TESTS_CREDS_FQDN
	$(error BEAME_TESTS_CREDS_FQDN is undefined)
endif
ifndef BEAME_TESTS_ROOT_CREDS_FQDN
	$(error BEAME_TESTS_ROOT_CREDS_FQDN is undefined)
endif
	DEBUG="beame:sdk:unittests:*" BEAME_LOG_LEVEL=FATAL ./node_modules/mocha/bin/mocha tests/unit_tests/*.js

# TODO: gulp doc
