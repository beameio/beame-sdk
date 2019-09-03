default:
	exit 1

build:
	npm install

prepclitests:
	rm -rf /tmp/tests/
	mkdir /tmp/tests
	cp -Rv ~/n6ge8i9q4b4b5vb6.h40d7vrwir2oxlnn.v1.d.beameio.net /tmp/tests/
dev-clitests: prepclitests
	(cd tests/cli_tests && DEBUG=process BEAME_ENV=dev HOME=/tmp/tests ./testAll.ngs)
prod-clitests: prepclitests
	(cd tests/cli_tests && DEBUG=process BEAME_ENV=prod HOME=/tmp/tests ./testAll.ngs)

dev-unittests:
	DEBUG="beame:sdk:unittests:*" BEAME_ENV=dev mocha tests/unit_tests/*.js
prod-unittests:
	DEBUG="beame:sdk:unittests:*" BEAME_ENV=prod mocha tests/unit_tests/*.js

# TODO: gulp doc
