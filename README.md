<img align="right" src="img/beame.png">
_The Beame SDK provides tools that allow you to create credentials to identify machines and devices. It’s a simple way to use encryption-based identity in web and mobile applications. This transparent security infrastructure can be used in any network, global or local, to create credentials, bind them to users’ hardware, and get strong, crypto-based authentication. This mitigates risk for organizations or services that require users to prove identity._ 

###**By deploying your network using Beame infrastructure, you can:**

1. Quickly host a public HTTPS server on a local machine (does not require public static IP, DMZ, nor port forwarding);
2. Generate credentials and assign your own meaning to them (identity);
3. Deploy services that are accessible from the Internet or only from your LAN without network reconfiguration.


###**How:** 
1. Get a unique hostname under the Beame subdomain;
2. Generate your private key locally;
3. Get a matching certificate from Beame (signed by a root CA).

***
## Table of Contents
 - [Common Uses for Beame SDK](#common-uses-for-beame-sdk)
 - [System Requirements](#system-requirements)
 - [Easy Installation Instructions](#easy-installation-instructions)
 - [Getting Started - Mac](#getting-started---mac)
 - [Getting Started - Windows](#getting-started---windows)
 - [High Level Architecture](#high-level-architecture)
 - [Beame Network Infrastructure](#beame-network-infrastructure)
 - [Custom Provisioning Workflow](#custom-provisioning-workflow)
 - [Custom Client Provisioning Flow Chart](#custom-client-provisioning-flow-chart)
 - [Beame CLI (credentials, running test server, encryption)](#beame-cli)
 - [Beame NodeJS API](#beame-nodejs-api)
 - [Examples of full-stack of credentials and https server with express support](#sample-https-server)

***
## Common Uses for Beame SDK 

See the example folder to copy-paste and try it for yourself!  

 - Build your own networking application
 - Global, local, or hybrid socket.io chat over TLS
 - Patient ID in clinics using mobile phone 
 - BYOD in local networks (access behind NAT)
 - Multi-factor authentication
 - Check signatures of arbitrary data
 - Encrypt arbitrary data so that only a specified entity can decrypt it
 - Decrypt arbitrary data that was sent to one of the entities you own (encrypted with one of your public keys)
 - Sign arbitrary data with any of your certificates 

***
## System Requirements
Mac OS or Windows 8.1 (or higher);
NPM installed on your machine;
For Mac: Click here to for instructions if current shell version does not support auto-completion. 


***

## Easy Installation Instructions
You will create three tiers of credentials (each with multiple components: RSA key pair, a hostname under Beame.io's domain, and a matching publicly trusted x509 certificate). If you want to skip all intro, [jump directly to action](#beame-cli)

1. First, generate your Developer credentials.
2. Second, generate application credentials. We call this level an Atom.  
3. Create your Client server credentials.  We call this level an Edge-Client. 

***
Our extended demo ([see it here](#running-test-server)) has two features - chat, or file server: 
 - To access the chat, just copy the URL to your browser. (By the way, you can freely send it to other people on other networks. The server is global and the TLS is real). 
 - To access the file share function, open the `url/shared`. 

***
## Getting Started - Mac 

 - Install the Beame SDK by running `npm install -g beame-sdk` 
 - Register as a developer. 
 - Copy the command from the email. It should look like this: `beame creds createDeveloper --developerFqdn ndfxfyerylk6uvra.v1.beameio.net --uid 1d138bfc-4a37-48e7-a60d-0190037fda5f` 
 - Run `beame servers startFirstBeameNode` it will print out to you something that looks like this: 
`Server started on https://fdddr5ggsyzhk6m8.v1.r.p.edge.eu-central-1b-1.v1.p.beameio.net this is a publicly accessible address` 

***
## Getting Started - Windows 

Before running `npm install -g beame-sdk` please make sure you have OpenSSL installed in `C:\OpenSSL-Win64` . 
One of the possible ways of installing OpenSSL is described below. The procedure was tested on Microsoft Windows Server 2012 R2 Standard . 

### Install Visual C++ Build Tools and Python 2.7 
`npm install --global --production windows-build-tools`

### Upgrade npm 
`npm -g install npm@latest`

### Install Perl 
Get Perl from 
`http://downloads.activestate.com/ActivePerl/releases/5.24.0.2400/ActivePerl-5.24.0.2400-MSWin32-x64-300558.exe`
or another source 
Perl is needed for building OpenSSL 

### Install OpenSSL 
 Download and extract `https://www.openssl.org/source/openssl-1.0.1t.tar.gz` 
 Using "Visual C++ 2015 x64 Native Build Tools Command Prompt" under 
 `C:\Program Files (x86)\Microsoft Visual C++` 
 Build  `Tools\` in the OpenSSL directory 
    `perl Configure VC-WIN64A no-asm --prefix=C:\OpenSSL-Win64` 
    `.\ms\do_win64a.bat` 
    `nmake -f ms\ntdll.mak clean` 
    `nmake -f ms\ntdll.mak` 
    `nmake -f ms\ntdll.mak install` 

`npm install -g beame-sdk` 
***
***
#Beame.io Networking Solution Overview
***
***
## High Level Architecture 

![high level architecture](img/SDKbuildingBlocks.jpg)
***
All routable nodes created with the Beame SDK are clients of Beame services. From the application perspective, they are HTTPS servers. 

### Elements of the High Level Architecture
 - *Local Client* - hosts that are created with local IP
 - *Edge Client* - hosts that are accessible from the Internet, clients of *Edge Servers*
 - *Clients* - actual end users (mobile devices)
 - *Customers* - owners of networks created with Beame Infrastructure (described below)
 - *Developer* - holder of credentials to directly request Beame provision services
 - *Atom* - application under *developer*, used as a master node for networks built with Beame Infrastructure

***

## Beame Network Infrastructure

Actions to employ: 
 - *Developer* registration using email-based procedure
 - Deployment of *Atom* as entity to control access permissions for all devices intended to be a part of the network (customers and clients)
 - Deployment of *Customer Edge Clients*. Each of the hosts, created on this step, shall be used as a Customer’s provisioning entry point. Any *client* that needs to be allowed into the network must undergo registration procedure as described below
 - Provisioning *clients* into *Customer*’s network

***

## Custom Provisioning Workflow

![provisioning workflow](img/ProvisioningClient.jpg)
***
*CMPS* (Customer Managed Provisioning Server) credentials are pinned in the *Atom*, during *CMPS* deployment, prior to the first run of the service. 

The custom provisioning process requires *Customer* to deploy *Edge Clients* (*CMPS*s) with corresponding permissions under his internal security policy. 

The custom provisioning process uses the *Atom* as single authorization point. 










*****
## Custom Client Provisioning Flow Chart

![provisioning flowchart](img/clientProvisionFlowchart.jpg)
****
### There are three interleaved flows in the provisioning process: 
 - *CMPS flow* - process takes place on the *Customer* provisioning station, controls the whole process; 
 - *Atom flow* - background process controlled by Customer’s *Atom*; 
 - *Client flow* - process that takes place on the mobile device. Requires corresponding mobile Beame SDK services. 

****
****
****
# Mastering the Beame-SDK
***
***
***
## Beame CLI

If you have completed the "Getting Started The Easy Way" above, and know how your future application will look, you can feel free to use all of what's described below. 
At any moment, using beame-sdk, you can see all credentials you currently own by running: 
 - `beame creds show` 

### CLI - credentials

The following commands are used for acquiring and manipulating certificates.

* `beame creds list [--type {developer|atom|edgeclient}] [--fqdn fqdn] [--format {text|json}]` - list certificates
* `beame creds show [--type {developer|atom|edgeclient}] [--fqdn fqdn] [--format {text|json}]` - show certificate details
* `beame creds createAtom --developerFqdn developerFqdn --atomName atomName [--format {text|json}]` - create *atom* entity under current *developer*
* `beame creds createEdgeClient --atomFqdn atomFqdn [--format {text|json}]` - create *edge client* entity under the given *atom*
* `beame creds createLocalClient --atomFqdn atomFqdn [--count count] --edgeClientFqdn edgeClientFqdn [--format {text|json}]` - create *local client* entity under the given atom paired to existing *edge client*
* `beame creds renew [--type {developer|atom|edgeclient}] [--fqdn fqdn]`
* `beame creds purge [--type {developer|atom|edgeclient}] [--fqdn fqdn]`

### Running test server

* `beame servers HttpsServerTestStart --edgeClientFqdn edgeClientFqdn` - run a HTTPS server for the specified hostname
* `beame.js servers startFirstBeameNode [--sharedFolder sharedFolder]` - run chat example for first hostname in creds list
* `beame.js servers startBeameNode [--sharedFolder sharedFolder] --edgeClientFqdn edgeClientFqdn` - run chat example for the specified hostname

### Beame.io CLI - encryption

* `beame crypto encrypt [--data data] [--fqdn fqdn]` - encrypts the given data so that only the owner of the specified entity can decrypt it
* `beame crypto decrypt [--fqdn fqdn] [--data data]` - decrypts the given data. You must be the owner of the given entity
* `beame crypto sign [--data data] [--fqdn fqdn]` - signs the given data as the specified entity
* `beame crypto checkSignature [--fqdn fqdn] [--data data] --signature signature` - verifies the correctness of the signature

***
## Beame NodeJS API 
[Extended JsDoc generated documentation - here](https://beameio.github.io/beame-sdk/index.html)

_The idea behind the Node.js SDK APIs is that you can employ Beame CLI functionality in your own Node.js project._ 

Receive publicly trusted cert with a pseudo-random routable hostname and run your new SSL server in the same flow (or later, whenever you see it fit). 

Current SDK release intends extensive CLI usage (see description above). So Node.js APIs provide a high level of access.

Be aware that API on each level requires credentials created on previous/higher level:

To use any API from beame-sdk include 
`var beameSDK = require ("beame-sdk");`
***

### Atom level commands
Requires developer credentials (developer fqdn/hostname) + atomName (your application name) 
To create new atom under current developer: 
```   
    beameSDK.creds.createAtom(devHostname, atomName, amount, function(data){//amount - number of atoms to create
        //atom level hostname returned in: <data.hostname>
    });
 ```
### Edge Client level commands
Requires atom credentials (atom fqdn/hostname). atomHostName - app level hostname created in previous step 
To create new edgeClient under current atom: 
```
   beameSDK.creds.createEdgeClient(atomHostname, amount, function(data){//amount - number of edgeClient to create
        //edge level hostname returned in: <data.hostname>
    });
```
***
## Sample HTTPS Server
Beame-sdk provides sample https server, that allows Beame client to build and run fully a functional https server with express support and with credentials created in steps described above

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
***
## Copy-paste examples
***
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

### Sample HTTPS server - short

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
