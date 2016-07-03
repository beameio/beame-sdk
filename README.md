# Beame.IO SDK

## Installing Beame.IO SDK

To use tests from this repo, first run "npm install beame-api"

## Beame.IO SDK introduction

Beame.IO SDK introduction. The Beame.IO SDK allows to easily register routable
hostnames. This essentially allows access to a device without routable IP
address. Beame.IO SDK provides ability to easily generate random hostnames, and
get matching certificates for them. 

The Beame.IO service is designed to be used in bulk. Its goal is providing
strongly authenticated endpoint for accessing client devices, as well as easy
and affordable access to use of x509 certificates.

Essentially, what Beame.IO allows to do is to get a random common name signed,
and easily be able to receive https traffic on that endpoint.

## Beame.IO SDK - High level architecture

The Beame.IO SDK credentials systems, is build around two concepts:
	1. Transport layer security - proving ownership of certain common
	   name  (hostname), via client side cert, server side cert.
	2. Provisioning Authentication Proof of ownership of keys via a web API


You will be issued an organization certificate. It will have a hostname.  In
order to take actions as your organization your will be required to prove
ownership of the cert (hostname).  This can happen one of two ways:

1. Using it as a client cert and access Beame.IO .
2. Using it as a server cert when Beame.IO accesses you with push of freshly issued certificate.


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

## Beame.IO CLI

### Setting up Beame.IO CLI

	beame init

`beame init` will establish your credentials in our system and will store them in the `BEAME_DIR` folder. The structure of the folder is self-explanatory.
On each level the will be a JSON file. At each level of the directory structure you will find:

	private_key.pem 
	x509
	metadata.json


After 'beame init' is ran, you can run:
	beame credentials show 

	
### Beame.IO CLI - selecting acting entity

CLI options:
	
* `--developer name` (If there is only one developer, it will be used as default)
* `--atom name`
* `--instance name`

### Beame.IO CLI top level commands

	beame credentials show

Shows a tabular output of all the credentials in the system.
	
	beame credentials export --password

Creates a password protected zip file, with all of the credentials on the given system.

	beame data sign [options] 

Signs data on `stdin` using provided credentials (app developer level, app level, or instance level)

	beame data encrypt --public-key key

Encrypts data on `stdin` for the given public key `key`

	beame data encrypt --public-key-pem file

Encrypts data on `stdin` for the given public key in file `file`

	beame data encrypt --hostname host

Queries Beame for a public key related to that hostname. Encrypts data on `stdin` for the public key.

	beame data decrypt --developer name --atom name --instance name 

Will read data from stdin, query beame for a public key related to that hostname and decrypt the data with specific public key
		
	beame get-public-key hostname

shows public key of the given `hostname`

	beame atoms list --developer

TODO

	beame help 

TODO

	beame start demo-server --developer

Start a server, and a subsequent set of clients, with some kind of performance benchmack.

	beame start ssl-proxy --host --port [potentially multipe if we do an inbound sni sniff]

TODO
	
	beame start http-proxy --host --port --hostname // Terminates encryption

TODO
	
	beame start unit-test

TODO
	
	beame start gateway-server-demo

This is a demo which demonstrates how you can sign requests for beame for establishing credentialing in your atoms, but providing a crypto challange response. 
	
## Beame.IO NodeJS API

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

