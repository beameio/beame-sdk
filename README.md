##### THIS IS UNDER CONSTRUCTION AND NOT READY FOR USAGE IF YOU ARE INTERESTED IN 
##### BEING ONE OF THE FIRST ONES TO USE IT CONTACT LISA@BEAME.IO
##### WE PLAN TO RELEASE A BETA IN MID JULY 

# What Beame.io does for you?

##  Beame.io provides you with x509 (aka SSL aka HTTPS) certificates

The certificates are signed by a publically trusted CA, similar to any other site that uses HTTPS.
You get a hostname (*Common Name* in the certificate) that is under Beame's domain and a matching certificate.

## Beame.io provides you with tunnelling service

Our tunnel servers allow routing of traffic to your servers even when your server does not have a routable IP address.

## Beame.io network diagram

TODO

## Steps to use Beame.io

At each of the following steps you are provided with a hostname under Beame's domain and a matching publically trusted x509 certificate.

1. Register as a *developer*
1. Create an *atom* (roughly an application) under the *developer*.
1. Create an *edge client* (roughly a server) under the *atom*.

At this point you can proceed with one of the following usages:

* Run a server (aka *edge client*) with publically trusted x509 certificate.
* Sign arbitrary data with any of your certificates
* Check signatures of arbitrary data
* Encrypt arbitrary data so that only specified entity (someone that has specific x509 certificate) can decrypt it.
* Decrypt arbitrary data that was encrypted to one of the entities you own (encrypted to one of your certificates).

# Beame.io SDK

	npm install beame-sdk

## Beame.io SDK - High level architecture

The Beame.io SDK credentials system is build around two concepts:

1. Transport Layer Security - proving ownership of certain common name
   (hostname), via client side certificate or server side certificate.
2. Provisioning Authentication Proof of ownership of keys via a web API


You will be issued an organization certificate. It will have a hostname.  In
order to take actions as your organization your will be required to prove
ownership of the cert (hostname).  This can happen one of two ways:

1. Using it as a client cert and access Beame.io .
2. Using it as a server cert when Beame.io accesses you with push of freshly issued certificate.


In fact we have three layers (organizational, you will only have one), atom, is
essentially a logical separation of instances in our particular environment.

## Typical deployment

1. Gateway server (equipped with atom keys)
2. Instance contacts the gateway server and requests to sign its request to Beame.
3. The gateway server will sign the request using its private key and common name.
4. Instance will send this signed request to Beame, and automatically deliver the x509 cert signing server.


	-+Developer
	|
	+ Atom
		+ Instances


This is also the structure of the `~/.beame` folder. The location of the folder
can be controlled by setting the `BEAME_DIR` environment variable, export

	BEAME_DIR='path' # /home/userz/.beame

## Beame.io SDK environment variables

* `BEAME_DIR` (defaults to `~/.beame`) - Beame.io SDK data directory

## Beame.io SDK data directory

The structure of the Beame data folder is implementation detail. You should not directly work with it. Use API or CLI to store and retrieve the data.

## Beame.io CLI

### Beame.io CLI - setting up [not ready]

	beame init

`beame init` will establish your credentials in our system.

After 'beame init' is ran, you can run:
	beame credentials show

### Beame.io CLI - credentials

The following commands are used for acquiring and manipulating certificates.

* `beame.js creds list [--type {developer|atom|edgeclient}] [--fqdn fqdn] [--format {text|json}]`
* `beame.js creds show [--type {developer|atom|edgeclient}] [--fqdn fqdn] [--format {text|json}]`
* `beame.js creds createDeveloper --developerFqdn developerFqdn --uid uid [--format {text|json}]`
* `beame.js creds createAtom --developerFqdn developerFqdn --atomName atomName [--format {text|json}]`
* `beame.js creds createEdgeClient --atomFqdn atomFqdn [--format {text|json}]`
* `beame.js creds createTestDeveloper --developerName developerName --developerEmail developerEmail [--format {text|json}]`
* `beame.js creds renew [--type {developer|atom|edgeclient}] [--fqdn fqdn]`
* `beame.js creds purge [--type {developer|atom|edgeclient}] [--fqdn fqdn]`

### Beame.io CLI - running test server

* `beame.js servers HttpsServerTestStart --edgeClientFqdn edgeClientFqdn`

### Beame.io CLI - encryption

* `beame.js crypto encrypt [--data data] [--fqdn fqdn]`
* `beame.js crypto decrypt [--fqdn fqdn] [--data data]`
* `beame.js crypto sign [--data data] [--fqdn fqdn]`
* `beame.js crypto checkSignature [--fqdn fqdn] [--data data] --signature signature`

	
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

