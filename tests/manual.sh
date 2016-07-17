#!/usr/bin/env bash
fqdn1=".."
fqdn2=".."
./beame.js crypto encrypt --data 123qwe --fqdn $fqdn1 >1
./beame.js crypto decrypt --data "$(cat 1)"

./beame.js crypto sign --data 123qwe --fqdn $fqdn1 >1
./beame.js crypto checkSignature --data 123qwe --signature "$(cat 1)" --fqdn $fqdn1

./beame.js creds exportCredentials --fqdn $fqdn1 --targetFqdn $fqdn2 --file 1a
./beame.js creds importCredentials --file 1a
