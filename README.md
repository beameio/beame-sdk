# Beame.IO sdk introduction

To use tests from this repo, first run "npm install beame-api"

Beame.IO sdk introduction. The beame.io sdk allows to easily register routable
hostnames. This essentially allows access to a device without routeable IP
address. Beame.io sdk provides ability to easily generate random hostnames, and
get matching certificates for them. 

The beame.io service is designed to be used in bulk. Its goal is providing
strongly authenticated endpoint for accessing client devices, as well as easy
and affordable access to use of x509 certificcates.

Easentially, whay beame.io allows to do is to get a random common name signed,
and easily be able to recive https traffic on that endoint.  

High level architecture: 

The beamesdk credentiality systems, is build around two concepts: 
	1. Transport layer security Meaning proving ownership of certain common
	   name  (hostname), via client side cert, server side cert.
	2. Provisioning Authentication Proof of ownership of keys via a web api


You will be issued an organization certificate it will have a hosntame
host name. In order to take actions as your organization your will be required to prove ownership of the cert.  This can happen one of three ways 

1. using it as a client cert and access beame, 
2. using it as a server cert when beame access you with push of freshly issued certificate. 


In fact we have three layers (organizational, you will only have
one), atom, is essentially a logical seperation of instances in our particular
envieroment. 

Here is how this would typically be deploied: 
1. Gateway server (equpied with atom keys) 
2. Instance contacts the gateway server and requests to sign its request to beame.
3. The gateway server will sign the request using its private key and cn 
4. Instance will send this signed request to beame, and automatically deliver the x509 cert signing server 


-+Developer
 |
 + Atom
 	+ Instances 


This is also the strcutre of the ~/.beame folder. The location of the folder
can be controlled by setting the BEAME_DIR envieromental variable, export

BEAME_DIR='path' # /home/userz/.beame 

Using beame_api from command line:

[Step 1: beame init]

Beame init will establish your credentials in our system. And store it in the BEAME_DIR folder. The structure of the folder is self explanetory.
On each level the will be a file in json format, at each level of the directory stucture you will find:

	private_key.pem 
	x509
	metadata.json


After 'beame init' is ran, you can run:
	beame credentials show 

	
[top level commands]

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
	
------------------------------------------------------------------------------------------------
nodejs api 

	the idea behain the node.js implementation is so that you can easily contact a gateway server

It wi
Generate your own keys in RSA format, and
request them to be signed.  Once they are signed they and recivie publically
trusted SSL certificates. You can get lots of ssl certificates, very quicky.
The command line actually  

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

