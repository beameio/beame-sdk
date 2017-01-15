default:
	exit 1

build:
	npm install

test:
	rm -r ~/.beame || true
	cd tests/cli_tests && ./testAll.ngs

# TODO: gulp doc
