##### THIS IS UNDER CONSTRUCTION AND NOT READY FOR USAGE IF YOU ARE INTERESTED IN 
##### BEING ONE OF THE FIRST ONES TO USE IT CONTACT LISA@BEAME.IO
##### WE PLAN TO RELEASE A BETA IN MID JULY 

# Beame.io SDK

## Installing Beame.io SDK

To use tests from this repo, first run "npm install beame-api"

## Beame.io SDK introduction

1. The Beame.io SDK allows to register routable hostname for a device without
   a routable IP address.

2. Beame.io SDK provides ability to easily generate random hostnames, and get
   matching certificates for them. These hostnames can be used for routing the
   traffic to your device without a routable IP address.

The Beame.io service is designed to be used in bulk. Its goal is providing
strongly authenticated endpoint for accessing client devices, as well as easy
and affordable access to use of x509 certificates.

Essentially, what Beame.io allows to do is to get a random common name signed,
and easily be able to receive https traffic on that endpoint.

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

## Beame.io CLI

### Setting up Beame.io CLI

	beame init

`beame init` will establish your credentials in our system and will store them in the `BEAME_DIR` folder. The structure of the folder is self-explanatory.
On each level the will be a JSON file. At each level of the directory structure you will find:

	private_key.pem 
	x509
	metadata.json


After 'beame init' is ran, you can run:
	beame credentials show 

	
### Beame.io CLI - selecting acting entity

CLI options:
	
* `--developer name` (If there is only one developer, it will be used as default)
* `--atom name`
* `--instance name`

### Beame.io CLI top level commands

	beame credentials export --password
 	beame types list

### Certificate Commands 
	
	beame creds list   --type {developer|atom|instance}  --format {json|text}
	beame creds create --type {developer|atom|instance} --localip { ipaddress | auto } --format {json|text} 
	beame creds renew  --type {developer|atom|instance} jdafskljdasjkldsa.beameio.net} --format {json|text} 
	beame creds purge  --type {developer|atom|instance} --localip { ipaddress | auto } --format {json|text}

### Cert Services 


	beame cert show	 jdafskljdasjkldsa.beameio.net  --format {json|text} 

### Data Commands 

	beame data sign    --type {developer|atom|instance} jdafskljdasjkldsa.beameio.net 
	beame data encrypt  jdafskljdasjkldsa.beameio.net
	beame data decrypt ---type {developer|atom|instance} jdafskljdasjkldsa.beameio.net 


### Low Level Api 

	beame cert fetch <fqdn>

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

