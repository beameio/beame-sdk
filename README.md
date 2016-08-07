
# What does Beame.io SDK do for you?

##  Beame.io SDK provides you with easy-to-use tools to access a device without a public IP address, with SSL certificates issued specifically for the device.  We also make it easy and fast to programatically obtain publicly trusted certs and use them as needed for any purpose. 

You can expose your local machine, deploy a service literally without any network configation, and now you can host a public server without a DMZ;

The certificates are signed by a publicly trusted CA, similar to any other site that uses HTTPS;

The SDK supports both global and local computer network interfaces.

You get:

1. A hostname (*Common Name* in the certificate) that is under Beame's domain.
2. A matching certificate.

Of course the cert fits the private key that was generated locally on your device J.

Credentials that you create using Beame SDK can be used for TLS on your server, or any other relevant purpose, such as authentication and encryption.  
Beame.io *provisioning* handles ... the provisioning of certificates.


## Getting Started The Easy Way

1. Install Beame.io SDK by running `npm install -g beame-sdk` (Windows users please see additional instructions below)
2. Register as a [developer](https://registration.beameio.net/).
3. Copy a command from the email. It should look like this `beame creds createDeveloper --developerFqdn ndfxfyerylk6uvra.v1.beameio.net --uid 1d138bfc-4a37-48e7-a60d-0190037fda5f` 
4. Run `beame servers startFirstBeameNode` it will print out to you something that looks like this: 
		`Server started on https://fdddr5ggsyzhk6m8.v1.r.p.edge.eu-central-1b-1.v1.p.beameio.net this is a publicly accessible address`

5. Our demo has two features, chat, or file server:
	a. To access the chat just copy the URL to your browser. (Btw you can freely send it to other people on other networks, server is global TLS is real);
	b. To access the file share function open the url /shared ie. https://fdff......beameio.net/shared 
Enjoy!

### Getting Started The Easy Way - Windows

Before running `npm install -g beame-sdk` please make sure you have OpenSSL installed in `C:\OpenSSL-Win64` . One of the possible ways of installing OpenSSL is described below. The procedure was tested on `Microsoft Windows Server 2012 R2 Standard` .

	# Install Visual C++ Build Tools and Python 2.7:
	npm install --global --production windows-build-tools

	# Upgrade npm:
	npm -g install npm@latest

	# ( Install Perl from http://downloads.activestate.com/ActivePerl/releases/5.24.0.2400/ActivePerl-5.24.0.2400-MSWin32-x64-300558.exe or another source
	#   Perl is needed for building OpenSSL )

	# Install OpenSSL:
	# ( Download and extract https://www.openssl.org/source/openssl-1.0.1t.tar.gz )
	# Using "Visual C++ 2015 x64 Native Build Tools Command Prompt" under C:\Program Files (x86)\Microsoft Visual C++ Build Tools\ in the OpenSSL directory
		perl Configure VC-WIN64A no-asm --prefix=C:\OpenSSL-Win64
		.\ms\do_win64a.bat
		nmake -f ms\ntdll.mak clean
		nmake -f ms\ntdll.mak
		nmake -f ms\ntdll.mak install

	npm install -g beame-sdk

## Beame.io provides you with a tunneling service

Our tunnel servers (the *edge servers*) allow routing of traffic to your servers even when your servers don't have routable IPs.

## Beame.io network diagram

Please note that this diagram was designed to show how the service works. It's important to understand that Beame SSL proxies are transparent; data passes through them without being touched.

![Network diagram](readme-net-diag-small.png)

[See larger network diagram](readme-net-diag-large.png)


## Steps to use Beame.io SDK

At the end of each of the following steps you will be provided with a hostname under Beame's domain and a matching publicly trusted x509 certificate. The keys for the certificates are generated and stored locally on your computer. The keys do not leave your computer (unless you intentionally export them).

1. [Create an *atom* (an application) under the *developer*](#to-create-new-atom-under-current-developer)
1. [Create an *edge client* (a user server) under the *atom*](#edgeclient-level-commands)
2. [See full copy-paste example](#copy-paste-example-of-creation-of-full-stack-of-credntials-and-running-of-https-server-with-express-support)  or see example in example folder

At this point you can proceed with any of the following actions:

* Run a server (aka *edge client*) with a publicly trusted x509 certificate
* Sign arbitrary data with any of your certificates
* Check signatures of arbitrary data
* Encrypt arbitrary data so that only a specified entity can decrypt it
* Decrypt arbitrary data that was sent to one of the entities you own (encrypted with one of your public keys)

## Beame.io SDK Bash shell

Bash completion is available, run `beame` to see instructions.

## If current shell version does not support auto completion, please follow instructions below (mostly relevant for MacOS):
First ensure that your bash version is 4.3 or higher (`echo $BASH_VERSION`). If not - upgrade it. Take care to replace *4.3.46* from snippets below by your new bash version:  
	`brew update && brew install bash`  
Add new shell to available shells:  
    `sudo bash -c 'echo /usr/local/Cellar/bash/4.3.46/bin/bash >> /etc/shells'`  
Change to the new shell:  
    `chsh -s /usr/local/Cellar/bash/4.3.46/bin/bash`  

Open new terminal and run:
```
brew tap homebrew/versions
brew rm bash-completion
brew install bash-completion2
```
Add following instructions to your `.bashrc` file (if you don't have `.bash_profile` in your *Home* directory, create one :)

    if [ -f $(brew --prefix)/share/bash-completion/bash_completion ]; then
        . $(brew --prefix)/share/bash-completion/bash_completion
    fi

    source /usr/local/lib/node_modules/beame-sdk/src/cli/completion.sh

Open new terminal and begin using beame-sdk cli with auto-completion.

## Beame.io SDK environment variables

* `BEAME_DIR` (defaults to `~/.beame`) - Beame.io SDK data directory - all created credentials

## Beame.io SDK data directory

The structure of the Beame data folder is an implementation detail. You should not work with it directly. Use provided APIs or CLI to store and retrieve the data.

## Beame.io CLI

If you have completed the "Getting Started The Easy Way" above, you can feel free to use all of what's described below.
At any moment, using beame-sdk, you can see all credentials you currently own by running:
	`beame creds show`

### Beame.io CLI - credentials

The following commands are used for acquiring and manipulating certificates.

* `beame creds list [--type {developer|atom|edgeclient}] [--fqdn fqdn] [--format {text|json}]` - list certificates
* `beame creds show [--type {developer|atom|edgeclient}] [--fqdn fqdn] [--format {text|json}]` - show certificate details
* `beame creds createAtom --developerFqdn developerFqdn --atomName atomName [--format {text|json}]` - create *atom* entity under current *developer*
* `beame creds createEdgeClient --atomFqdn atomFqdn [--format {text|json}]` - create *edge client* entity under the given *atom*
* `beame creds createLocalClient --atomFqdn atomFqdn [--count count] --edgeClientFqdn edgeClientFqdn [--format {text|json}]` - create *local client* entity under the given atom paired to existing *edge client*
* `beame creds renew [--type {developer|atom|edgeclient}] [--fqdn fqdn]`
* `beame creds purge [--type {developer|atom|edgeclient}] [--fqdn fqdn]`

### Beame.io CLI - running test server

* `beame servers HttpsServerTestStart --edgeClientFqdn edgeClientFqdn` - run a HTTPS server for the specified hostname
* `beame.js servers startFirstBeameNode [--sharedFolder sharedFolder]` - run chat example for first hostname in creds list
* `beame.js servers startBeameNode [--sharedFolder sharedFolder] --edgeClientFqdn edgeClientFqdn` - run chat example for the specified hostname
### Beame.io CLI - encryption

* `beame crypto encrypt [--data data] [--fqdn fqdn]` - encrypts the given data so that only the owner of the specified entity can decrypt it
* `beame crypto decrypt [--fqdn fqdn] [--data data]` - decrypts the given data. You must be the owner of the given entity
* `beame crypto sign [--data data] [--fqdn fqdn]` - signs the given data as the specified entity
* `beame crypto checkSignature [--fqdn fqdn] [--data data] --signature signature` - verifies the correctness of the signature

##############################################################################
#                            Beame.io NodeJS API                           

###The idea behind the Node.js SDK APIs is that you can employ Beame.io CLI functionality in your own Node.js project.
###Receive publicly trusted cert with a pseudo-random routable hostname and run your new SSL server in the same flow (or later, whenever you see it fit).

Current SDK release intends extensive CLI usage (see description above). So Node.js APIs provide a high level of access.  
Be aware that API on each level requires credentials created on previous/higher level:  
To use any API from beame-sdk include
```
var beameSDK = require ("beame-sdk");
```
##   atom level commands
###  Requires developer credentials (developer fqdn/hostname) + atomName (your application name)
###  To create new atom under current developer:
```
    beameSDK.creds.createAtom(devHostname, atomName, amount, function(data){//amount - number of atoms to create
        //atom level hostname returned in: <data.hostname>
    });
```
##   edgeClient level commands
###  Requires atom credentials (atom fqdn/hostname). atomHostName - app level hostname created in previous step
###  To create new edgeClient under current atom:
```
    beameSDK.creds.createEdgeClient(atomHostname, amount, function(data){//amount - number of edgeClient to create
        //edge level hostname returned in: <data.hostname>
    });
```
###Beame-sdk provides an example https server that allows Beame client to build and run fully a functional https server with express support and with credentials created in steps described above

Export environment variable 'BEAME_PROJ_YOURPROJECTNAME' with value of edge-client-hostname (edgeClientFqdn)
In your server main.js create your server with following command:
```
    	var BeameServer = beameSDK.BaseHttpsServer.SampleBeameServer(host, PROJECT_NAME, appExpress,
        function (data, app) {
            //your code
        });
```
### Input parameters:
*`host` - edge hostName (pass <null> if you use environment variable - see below)  
*`PROJECT_NAME` - name of environment variable that contains edgeClient hostname (pass <null> if you provided full hostname in first parameter)  
*`appExpress` - express object. If you don't need express in your application, pass <null>  
*`function(data,app){}` - callback, returned app - created http object

# Copy-paste example of creation of full-stack of credentials and running of https server with express support
## Steps to take before you run below code:

1. Create web page with your preferred software (like Keynote -> export HTML on Mac).  
2. Store your new web page in `public` folder in directory of your future web server.  
3. Run `npm init` in project directory (*enter* to all options that *npm* asks)  
4. In same location install `npm install beame-sdk --save`  
5. Install *express* package by `npm install express --save`   
6. Create index.js and copy-paste into it code below.
```
"use strict";
var beameSDK = require ("beame-sdk");
var express = require('express');
var devHostname = "put-here-Hostname-you-got-when-creating-developer";
var appName = "MyBeameTestServer";
var appExpress = express();
var edgeHostname;
appExpress.use(express.static(__dirname + '/public'));

var runTestBeameServer = function(){
    beameSDK.BaseHttpsServer.SampleBeameServer(edgeHostname, null, appExpress, function (data, app) {
        console.log('Server started on: https://'+edgeHostname);
        appExpress.get('/', function(req, res) {
            res.sendFile(path.join(__dirname + '/index.html'));
        });
            // process http events here with <app> if needed
    });
};

beameSDK.creds.createAtom(devHostname,appName, 1, function(data){
	console.log('Just created atom with host:'+data.hostname);
	beameSDK.creds.createEdgeClient(data.hostname, 1, function(edgeData){
		edgeHostname = edgeData.hostname;
		console.log('Congrats! My new hostname is: '+ edgeHostname);
		setTimeout(runTestBeameServer, 2000);//JIC - wait dns to update
	});
});
```
7. Run it with `node index.js`  
8. In console output you will see something like:  
`Server started on: https://h3a6ipg1jz95x35n.v1.r.p.edge.eu-central-1b-1.v1.p.beameio.net`
`{ Hostname: 'h3a6ipg1jz95x35n.v1.r.p.edge.eu-central-1b-1.v1.p.beameio.net' }`  

9. Go to web brower and direct it to your new secure web server by copying https://*hostname* from console output  
That's it. You have your own https server running on your local machine, accessible from anywhere in the world :)

#Copy-paste example of https server with express support

Below code snippet is actually a part of the larger code above. So it requires all needed installations (npm/express/beame-sdk/placing-html-files-in-*public*-folder) to be performed prior to run.  
In order to see credentials that you have created, use `beame creds list` in terminal. *Hostname*, that is listed in row named *edgeclient* ,is the one, that you'll need to provide to *SampleBeameServer* as *hostname*.

```
"use strict";
var beameSDK = require ("beame-sdk");
var express = require('express');
var appExpress = express();
var hostname = "h3a6ipg1jz95x35n.v1.r.p.edge.eu-central-1b-1.v1.p.beameio.net";
appExpress.use(express.static(__dirname + '/public'));

var runTestBeameServer = function(){
    beameSDK.BaseHttpsServer.SampleBeameServer(hostname, null, appExpress, function (data, app) {
        console.log('Server started on: https://'+hostname);
    });
};
runTestBeameServer();
```
