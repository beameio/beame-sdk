# Beame.IO SDK

## Installing

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

Beame init will establish your credentials in our system. And store it in the `BEAME_DIR` folder. The structure of the folder is self-explanatory.
On each level the will be a JSON file. At each level of the directory structure you will find:

	private_key.pem 
	x509
	metadata.json


After 'beame init' is ran, you can run:
	beame credentials show 

	
### Beame.IO CLI top level commands

	Default developer:
		If there is one developer present it will select that one is default. 

	Options: [--developer name --atom name --instance name ];
	
	beame credentials show
		Shows a tabular output of all the credentials in the system. 
	
	beame credentials export --password
		creates a passwor protected zip file, with all of the credentials on the given system.

	beame data sign [options] 
		will read data from sdtin, and sign it with the level of specific credentials. and output to stdout the credentials can be app developer level, app level, or instance level.

	beame data encrypt --publicKey || --beameHostName || --publicKeyPem // read from std in 
		will read data from stdin query beame for a public key related to that hostname and encrypt the data with that publci key. 

	beame data decrypt --developer name --atom name --instance name 
		will read data from stdin query beame for a public key related to that hostname and decrypt the data with specific public key  
		
	beame query_public_key hostname
		will outout public key of the specific public key

	beame atoms list --developer 

	beame help 

	beame start demoServer --developer 
		this will start a server, and a subsequent set of clients, with some kind of preformance benchmack.


	beame start sslProxy --targetHost --targetPort [potentially multipe if we do an inbound sni sniff]
	
	beame start httpProxy --targetHost --targetPort --targetHostname // Terminates encryption
	
	beame start unitTest 
	
	beame start GatewayServerDemo 
		This is a demo which demonstrates how you can sign requests for beame for establishing credentialing in your atoms, but providing a crypto challange response. 
	
## Beame.IO NodeJS API

The idea behind the node.js implementation is so that you can easily contact a
gateway server, generate your own keys in RSA format, and request them to be
signed.  Once they are signed they and receive publicly trusted SSL
certificates. You can get lots of SSL certificates, very quickly.

1. Top level commands 
	1. init
	2. backup credentials --password
	3. list all credentials.

1. Credentialing Commands:

	a. developer_register (no arguments)
		a. name, email, varification
	b. package_developer_credentials
	c. list_developers
	e. set default developer (if there is only one developer record)

2. atom_level_commands 
	a. atom-add --name 
	b. atom-delete --local 
All sequence is defined in runData.json file
runData.template contains full sequence without additional parameters (all
needed parameters will be defined in runtime)

running wrapper:

node index.js

It is possible to provide any json config file for the run:

node index.js userCfgFile.json
###
API call examples:

1:
node devCreate.js <developerName>
as result of this call directory containing developer data will be created under ./.beame
directory will be named by hostname received from provision

2:
node devGetCert.js <developer hostname>
this call will create private key + CSR, as result the key and a set of certs will be written
into developer directory (created in running devCreate.js)

3:
node devProfileUpdate.js <developer hostname>
issues a call to provision, signed with new developer certificate

4:
node devAppSave.js <developer hostname> <appName>
will receive from provision hostname and uid for new app. Directory named with new hostname will be created
under ./.beame/<developer hostname> directory

5:
node devAppGetCert.js <developer hostname> <app hostname>
this call will create private key + CSR, as result the key and a set of certs will be written into app folder
created in step 4

6:
node devAppUpdate.js <developer hostname> <app hostname> <newAppName>
will issue a call to change appName to provision, signed with app cert

7:
node edgeClientRegister.js <developer hostname> <app hostname> 
will receive routable hostname + unique ID from provision. Directory to hold client data, named with 
<client hostname> will be created under ./.beame/<developer hostname>/<app hostname>

8:
node edgeClientGetCert.js <developer hostname> <app hostname> <client hostname>
this call will create private key + CSR, as result the key and a set of certs will be written into client folder
created in step 7

