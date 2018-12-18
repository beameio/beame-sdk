default:
	exit 1

build:
	npm install

test:
	cd tests/cli_tests && ./testAll.ngs

# TODO: gulp doc
