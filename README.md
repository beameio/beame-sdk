##### THIS IS UNDER CONSTRUCTION AND NOT READY FOR USAGE IF YOU ARE INTERESTED IN 
##### BEING ONE OF THE FIRST ONES TO USE IT CONTACT LISA@BEAME.IO
##### WE PLAN TO RELEASE A BETA IN MID JULY 

# What does Beame.io do for you?

##  Beame.io provides you with x509 (aka SSL/TLS) certificates

The certificates are signed by a publicly trusted CA, similar to any other site that uses HTTPS.
You get:

1. A hostname (*Common Name* in the certificate) that is under Beame's domain.
1. A matching certificate.

Beame.io *provisioning* handles ... the provisioning of certificates.
These certificates can be used for HTTPS on a server or any other cryptography such as authentication and encryption.

## Beame.io provides you with a tunnelling service

Our tunnel servers (the *edge servers*) allow routing of traffic to your servers even when your server does not have a routable IP address.

## Getting Started The Easy Way 

1. run npm install -g beame-sdk
2. Go to https://registration.beameio.net/ with a regular web browser.
2. Put in your name and email, and wait for a confirmation email. 
3. In the confirmation email, you should see a command that looks like this, run it, 
 	`beame creds createDeveloper --developerFqdn nc6qd6e6w0vd8hw5.v1.beameio.net --uid XXXXX-5a45-4165-a3cb-fb4060e46671`  
	
## Beame.io network diagram

Please note that this is a diagram designed to help understand how the service works. What's critical to understand that beame proxies SSL transperently without opening of the traffic. 

![Network diagram](readme-net-diag-small.png)

[See larger network diagram](readme-net-diag-large.png)

## Steps to use Beame.io

At each of the following steps you are provided with a hostname under Beame's domain and a matching publicly trusted x509 certificate. The keys for the certificates are generated locally on your computer. The keys do not leave your computer (unless you specifically export them).

1. Register as a *developer*
1. Create an *atom* (an application) under the *developer*
1. Create an *edge client* (a user server) under the *atom*

At this point you can proceed with any of the following actions:

* Run a server (aka *edge client*) with a publicly trusted x509 certificate.
* Sign arbitrary data with any of your certificates
* Check signatures of arbitrary data
* Encrypt arbitrary data so that only a specified entity (someone that has a specific x509 certificate) can decrypt it.
* Decrypt arbitrary data that was encrypted to one of the entities you own (encrypted to one of your certificates).

# Beame.io SDK

# Installing Beame.io SDK

	npm install -g beame-sdk

Bash completion is available, run `beame` to see instructions.

## If current shell version does not support auto completion, please follow instructions below:
First ensure, that your bash version is 4.3 or higher. If not - upgrade it.
Next run in terminal:

    brew tap homebrew/versions
    brew rm bash-completion
    brew install bash-completion2

Add following instructions to your .bashrc file:

    if [ -f $(brew --prefix)/share/bash-completion/bash_completion ]; then
        . $(brew --prefix)/share/bash-completion/bash_completion
    fi

    source /usr/local/lib/node_modules/beame-sdk/src/cli/completion.sh
    sudo bash -c 'echo /usr/local/bin/bash >> /etc/shells'
    # Change to the new shell
    chsh -s /usr/local/bin/bash 
## Beame.io SDK environment variables

* `BEAME_DIR` (defaults to `~/.beame`) - Beame.io SDK data directory

## Beame.io SDK data directory

The structure of the Beame data folder is an implementation detail. You should not work with it directly. Use API or CLI to store and retrieve the data.

## Beame.io CLI

### Beame.io CLI - setting up [not ready]

	beame init

`beame init` will establish your credentials in our system.

After 'beame init' is ran, you can run:
	beame credentials show

### Beame.io CLI - credentials

The following commands are used for acquiring and manipulating certificates.

* `beame creds list [--type {developer|atom|edgeclient}] [--fqdn fqdn] [--format {text|json}]` - list certificates
* `beame creds show [--type {developer|atom|edgeclient}] [--fqdn fqdn] [--format {text|json}]` - show certificates' details
* `beame creds createDeveloper --developerFqdn developerFqdn --uid uid [--format {text|json}]` - create *developer* entity
* `beame creds createAtom --developerFqdn developerFqdn --atomName atomName [--format {text|json}]` - create *atom* entity under the given *developer*
* `beame creds createEdgeClient --atomFqdn atomFqdn [--format {text|json}]` - create *edge client* entity under the given *atom*
* `beame creds createTestDeveloper --developerName developerName --developerEmail developerEmail [--format {text|json}]` - used for internal Beame tests, do not use
* `beame creds renew [--type {developer|atom|edgeclient}] [--fqdn fqdn]`
* `beame creds purge [--type {developer|atom|edgeclient}] [--fqdn fqdn]`

### Beame.io CLI - running test server

* `beame servers HttpsServerTestStart --edgeClientFqdn edgeClientFqdn` - run an HTTPS server for the specified hostname

### Beame.io CLI - encryption

* `beame crypto encrypt [--data data] [--fqdn fqdn]` - encrypts the given data so that only the owner of the specified entity could decrypt it
* `beame crypto decrypt [--fqdn fqdn] [--data data]` - decrypts the given data. You must be owner of the given entity
* `beame crypto sign [--data data] [--fqdn fqdn]` - signes the given data as the specified entity
* `beame crypto checkSignature [--fqdn fqdn] [--data data] --signature signature` - checks the correctness of the signature

	
## Beame.io NodeJS API

The idea behind the node.js implementation is so that you can easily contact a
gateway server, generate your own keys in RSA format, and request them to be
signed.  Once they are signed they and receive publicly trusted SSL
certificates. You can get lots of SSL certificates, very quickly.

### Top level commands

	init()

	backup_credentials(password)

	list_all_credentials()

### Credentials commands

	developer_register()

TODO
name, email, verification

	package_developer_credentials()

TODO

	list_developers()

TODO

	set_default_developer()

TODO
if there is only one developer record

### Atom level commands

	atom_add(name)

	atom_delete(local)

All sequence is defined in `runData.json` file. `runData.template` contains full
sequence without additional parameters (all needed parameters will be defined
in runtime).

### Running the wrapper

	node index.js [userCfgFile.json]

### API calls examples

	node devCreate.js <developerName>

As result of this call directory containing developer data will be created
under `./.beame` directory will be named by hostname received from provision.

	node devGetCert.js <developerHostname>

Create private key + CSR, as result the key and a set of certs will be written
into developer directory (created in running `devCreate.js`)

	node devProfileUpdate.js <developerHostname>

Issues a call to provision, signed with new developer certificate

	node devAppSave.js <developerHostname> <appName>

Receive from provision hostname and uid for new app. Directory named with new hostname will be created
under ./.beame/<developerHostname> directory

	node devAppGetCert.js <developerHostname> <appHostname>

Create private key + CSR, as result the key and a set of certs will be written into app folder
created in step 4

	node devAppUpdate.js <developerHostname> <appHostname> <newAppName>

Change appName to provision, signed with app cert

	node edgeClientRegister.js <developerHostname> <appHostname>

will receive routable hostname + unique ID from provision. Directory to hold client data, named with 
<clientHostname> will be created under ./.beame/<developerHostname>/<appHostname>

	node edgeClientGetCert.js <developer hostname> <app hostname> <client hostname>

Create private key + CSR, as result the key and a set of certs will be written into client folder
created in step 7

## beame-sdk provides example https server, that allows beame client to build and run fully functional https server
## with express support and with credentials created in steps described above

run in your server folder:
    npm install beame-sdk -save

Export environment variable named 'BEAME_PROJ_YOURPROJECTNAME' with value of edge-client-hostname (edgeClientFqdn)

In your server main.js include following:
    var beameSDK = require ("beame-sdk");
    var appExpress = require('express');
    var host = beameSDK.beameUtils.getProjHostName("YOURPROJECTNAME");

Create your server with following command:
    var BeameServer = beameSDK.sampleNodeServer.SampleBeameServer(host, appExpress,
        function (data, app) {
            //your code
        });
If you don't need express in your pplication, pass <null> instead of appExpress in SampleBeameServer call.

Arrange your front-end and run your new beame server with:
    node your_server.js

The run will print your routable hostname into console

