default:
	exit 1

build:
	npm install

preptests:
	rm -rf /tmp/tests/
	mkdir /tmp/tests
dev-clitests: preptests
	cp -R ~/n6ge8i9q4b4b5vb6.h40d7vrwir2oxlnn.v1.d.beameio.net /tmp/tests/
	(cd tests/cli_tests && DEBUG=process BEAME_ENV=dev HOME=/tmp/tests ./testAll.ngs)
prod-clitests: preptests
	@echo "Still not implemented, missing test prod cred"

printunittestenv:
	@echo
	@echo "Running with:"
	@echo "  BEAME_TESTS_LOCAL_FQDN=${BEAME_TESTS_LOCAL_FQDN}"
	@echo "  BEAME_TESTS_LOCAL_ROOT_FQDN=${BEAME_TESTS_LOCAL_ROOT_FQDN}"
	@echo
dev-unittests: printunittestenv
	DEBUG="beame:sdk:unittests:*" BEAME_ENV=dev mocha tests/unit_tests/*.js
prod-unittests: printunittestenv
	DEBUG="beame:sdk:unittests:*" BEAME_ENV=prod mocha tests/unit_tests/*.js

# TODO: gulp doc
