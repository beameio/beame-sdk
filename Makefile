default:
	exit 1

build:
	npm install

printunittestenv:
	@echo
	@echo "Running with:"
	@echo "  BEAME_ENV=${BEAME_ENV}"
	@echo "  BEAME_TESTS_LOCAL_FQDN=${BEAME_TESTS_LOCAL_FQDN}"
	@echo "  BEAME_TESTS_LOCAL_ROOT_FQDN=${BEAME_TESTS_LOCAL_ROOT_FQDN}"
	@echo "  BEAME_AUTH_FQDN=${BEAME_AUTH_FQDN}"
	@echo

clitests: printunittestenv
ifndef BEAME_ENV
	$(error BEAME_ENV is undefined)
endif
ifndef BEAME_AUTH_FQDN
	$(error BEAME_AUTH_FQDN is undefined)
endif
	rm -rf /tmp/tests/
	mkdir /tmp/tests
	cp -R ~/.beame/v2/$$BEAME_AUTH_FQDN /tmp/tests/
	(cd tests/cli_tests && DEBUG=process HOME=/tmp/tests ./testAll.ngs)

unittests: printunittestenv
ifndef BEAME_ENV
	$(error BEAME_ENV is undefined)
endif
ifndef BEAME_TESTS_LOCAL_FQDN
	$(error BEAME_TESTS_LOCAL_FQDN is undefined)
endif
ifndef BEAME_TESTS_LOCAL_ROOT_FQDN
	$(error BEAME_TESTS_LOCAL_ROOT_FQDN is undefined)
endif
	DEBUG="beame:sdk:unittests:*" ./node_modules/mocha/bin/mocha tests/unit_tests/*.js

# TODO: gulp doc
