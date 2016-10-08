<img align="right" src="img/beame.png">
_The Beame SDK allows you to establish a HTTPS session between machines without public IPs. This SDK  allows you to create credentials and use them to identify machines. It’s a simple way to use encryption-based identity in web and mobile applications. This transparent security infrastructure can be used in any network, global or local, to create credentials, bind them to users’ hardware, and get strong, crypto-based authentication. This mitigates risk for services that host credentials to require users to prove identity._  
[Click to Get Started Now!](https://registration.beameio.net/)  


### Table of Contents
 - [Beame SDK Networking basics](#beame-sdk-networking-basics)
 - [Common Use for Beame SDK Infrastructure](#common-uses-for-beame-sdk-network-infrastructure)
 - [System Requirements](#system-requirements)
 - [Installation Guide](#installation-guide)
 - [Quick Start](#quick-start)
 - [Getting Started - Mac](#mac-system-requirements)
 - [Getting Started - Windows](#windows-system-requirements)
 - [High Level Architecture](#high-level-architecture)
 - [Custom Provisioning Workflow](#custom-provisioning-workflow)
 - [Custom Client Provisioning Flow Chart](#custom-client-provisioning-flow-chart)
 - [Beame CLI (credentials, running test server, encryption)](#beame-cli)
 - [Beame NodeJS API](#beame-nodejs-api)
 - [Examples of full-stack of credentials and https server with express support](#sample-https-server)

## Beame SDK Networking basics
_Beame-SDK, by design, provides full set of tools to implement fully functional, secure private network. Beame-SDK employs hierarchical network structure. The most top level is the Layer-0 (L0) - the network root. L1 is created underneath L0 and considered "child" of L0. L0 may have any number of "children" (L1's), each of those, in turn, can have its own "children" L2's and so on. Any lower level "child" can be tracked, by cryptography, up to its L0 "parent". This is the base for building a private network with proprietary chain of trust._  

## Common Uses for Beame SDK Network Infrastructure

See the example folder to copy-paste and try it for yourself!

 - Build your own networking application
 - Define chain of trust for devices in your Beame-SDK based network
 - Multi-factor authentication
 - Check signatures of arbitrary data
 - Encrypt arbitrary data so that only a specified entity can decrypt it
 - Decrypt arbitrary data that was sent to one of the entities you own (encrypted with one of your public keys)
 - Sign arbitrary data with any of your certificates
 - Global, local, or hybrid socket.io chat over TLS
 - Patient ID in clinics using mobile phone
 - BYOD in local networks (access behind NAT)

### By deploying your network using Beame infrastructure, you can:

1. Quickly host a public HTTPS server on a local machine (does not require public static IP, DMZ, nor port forwarding);
2. Generate credentials and assign your own meaning to them (identity);
3. Deploy services that are accessible from the Internet or only from your LAN without network reconfiguration.

:heavy_exclamation_mark: **Note: for the documentation that matches the latest NPM, please see the [`prod` branch](https://github.com/beameio/beame-sdk/tree/prod).**
 
## Installation Guide
_If you already know how Beame-SDK is working and want to skip the intro, [jump directly to start!](#beame-cli)_
### Beame-SDK proposes two options to start:

1. Create your own L0  
_You start by requesting a token at https://registration.beameio.net/. Completion of this step, following instructions that you can find below, will create highest level set of credentials._  
2. Use existing credentials to create new ones  
_You will use coresponding Beame-SDK cli command, as described below. As a result, you will create a new set of lower level credentials._  

Whichever option you will choose, using Beame-SDK, you will create a full tier of credentials: a RSA key pair, a hostname under Beame.io's domain, and a matching publicly trusted x509 certificate.
Creation of credentials by Beame-SDK, on any level, requires authorization. Beame-SDK is provided along with Auth-Server, that is built to generate encrypted, time-limited authorization tokens, that once validated, allow credentials reception.
Enterprise clients, that wish to employ their own authorization policy, will integrate an appropriate Beame-SDK-API for token generation into their own environment.  

## Here's how:
1. You will get auth-token or already have a set of Beame credentials;
2. You will get a unique hostname under the Beame subdomain;
3. You will generate your private key locally;
4. You will get a matching certificate from Beame (signed by a root CA).

Our extended demo ([see it here](#running-test-server)) has two features - chat, or file server:
 - To access the chat, just copy the URL to your browser. (By the way, you can freely send it to other people on other networks. The server is global and the TLS is real).
 - To access the file share function, open the `url/shared`.

## Quick Start
_Here you will find the instructions, how to create the very first, L0 Beame credentials. In order to request L1 and below, see description of [CLI Credentials getCreds](#credentials)  below._  
1. Request authorization token, by submitting a form at [https://registration.beameio.net/](#https://registration.beameio.net/)  
2. Follow instructions from the registration email, that you will receive as a result of step 1  
2.1 Install the Beame SDK by running `npm install -g beame-sdk`  
2.2 Run the command from the email you receive, it should look like:  
`beame creds getCreds --token IntcInNpZ25lZERhdGFcIjp7XCJjcmVhdGVkX2F0XCI6MTQ3NTgzNTIwMyxcInZhbGlkX3RpbGxcIjoxNDc2MDA4MDAzLFwiZGF0YVwiOlwiNTZkYTg1MzdkYWMwMzE2YWY3ODVmNjU4YjkxYjU2lnbmF0dXJlXCI6XCJKM01PWEU5Qi9URU5FUm5qR2pFeUY1Yk9KOUJmK21zL0QvclJuSXlxOXNVY2ljYzdGWG5OUVNkaFhsM1kvbFN4Tkk5UGZqZCtubEZTbnN6N3Rmd1pqbGFINUMzaXFNRWdVa2huMnhnN09NMWppK3hoNHRIdjFrK0VYSTRFLzlCbmlrNkp2b3krT0NLRFBZcEJtZ0NFOTB5WWpkL0lLTWZNeEZEV21QYUZSUHhJcFQwRnJiTU13Vm9zQnB6SG5BYnNDdlorRHRrMVUvNjY5Vmp3eHFXa3ZUQmVrem9qRkJ1R29SWFZHUEVCdXpVcXdIL081RndPcDJEMEM3M1VHdjlzVEJteDRvSDNPbmQ2WXJJcEFyOXVOaXdCL2kvV0ZNa2NoUUlUaDFnc1dDY3BDNVo3ZzM1WFROK0l5enRIQUxnRFpFUWo2YTMwaFRKSG5Nb2NBVjBEQVE9PVwifSI= --authSrvFqdn asdfghjkl.qwertyuiop.v1.d.beameio.net`  
3. Start your first HTTPS server by running `beame servers runHelloWorldServer`. It will print to your console something that looks like  
`[2016-10-08 12:01:28] [SNIServer] INFO: starting server on x5lidev3ovw302bb.v1.d.beameio.net`  
`[2016-10-08 12:01:29] [BeameServer] INFO: Server started on x5lidev3ovw302bb.v1.d.beameio.net`

You now have your public HTTPS server running. Just copy-paste the address to any web browser.  
<img src="./img/helloworld.png" width="430" height="300"/>

## System Requirements
Mac OS or Windows 8.1 (or higher);
NPM installed on your machine;
for Mac: See the Mac instructions below, if current shell version does not support auto-completion.

### Mac System Requirements
First ensure that your bash version is 4.3 or higher (`echo $BASH_VERSION`). If not - upgrade it.
Take care to replace 4.3.46 from snippets below by your new bash version:
```
brew update && brew install bash
Add new shell to available shells:
sudo bash -c 'echo /usr/local/Cellar/bash/4.3.46/bin/bash >> /etc/shells'
```
Change to the new shell:
`chsh -s /usr/local/Cellar/bash/4.3.46/bin/bash`

Open new terminal and run:
```
brew tap homebrew/versions
brew rm bash-completion
brew install bash-completion2
```
Add following instructions to your .bashrc file (if you don't have .bash_profile in your Home directory, create one :)
```
if [ -f $(brew --prefix)/share/bash-completion/bash_completion ]; then
    . $(brew --prefix)/share/bash-completion/bash_completion
fi

source /usr/local/lib/node_modules/beame-sdk/src/cli/completion.sh
```
Open new terminal and begin using beame-sdk cli with auto-completion.

### Windows System Requirements

Before running `npm install -g beame-sdk` please make sure you have OpenSSL installed in `C:\OpenSSL-Win64` . If you you already have OpenSSL installed at that location, skip the instructions below and just issue `npm install -g beame-sdk`. If you don't have OpenSSL in `C:\OpenSSL-Win64`, one of the possible ways of installing OpenSSL is described below (Install Visual C++ Build Tools and Python 2.7, Upgrade NPM, Install Perl, Install OpenSSL). The procedure was tested on Microsoft Windows Server 2012 R2 Standard and Windows 10. We recommend to use your “Windows PowerShell” and run it with administrator rights for the following commands:

### Install Visual C++ Build Tools and Python 2.7

`npm install --global --production windows-build-tools`. This typically takes 5 to 10 minutes, depending on the internet connection.

### Upgrade NPM

`npm -g install npm@latest`

### Install Perl

Perl is needed for building OpenSSL. If you already have Perl installed, please skip the `Install Perl` section.

Get Perl from
`https://downloads.activestate.com/ActivePerl/releases/5.24.0.2400/ActivePerl-5.24.0.2400-MSWin32-x64-300558.exe` (SHA256 is `9e6ab2bb1335372cab06ef311cbaa18fe97c96f9dd3d5c8413bc864446489b92`)
or another source.
 This version of Perl [might have](https://community.activestate.com/node/19784) [security](https://www.virustotal.com/en/file/9e6ab2bb1335372cab06ef311cbaa18fe97c96f9dd3d5c8413bc864446489b92/analysis/) [issue](https://www.metadefender.com/#!/results/file/c869301df9424b02aa49ce15d7bce692/regular/analysis) but my estimation is that it's false positive. Consider installing other versions or Perl built by other companies.

### Install OpenSSL

Download and extract `https://www.openssl.org/source/openssl-1.0.1t.tar.gz` (other versions might work but were not tested)

Using "Visual C++ 2015 x64 Native Build Tools Command Prompt" under `C:\Program Files (x86)\Microsoft Visual C++ Build Tools\` in the OpenSSL directory issue the following commands:

    perl Configure VC-WIN64A no-asm --prefix=C:\OpenSSL-Win64
    .\ms\do_win64a.bat
	# If the following "clean" fails it's OK, just continue with following commands
    nmake -f ms\ntdll.mak clean
    nmake -f ms\ntdll.mak
    nmake -f ms\ntdll.mak install

	npm install -g beame-sdk

#Beame.io Networking Solution Overview

## High Level Architecture

![high level architecture](img/SDKbuildingBlocks.jpg)

All routable nodes created with the Beame SDK are clients of Beame services. From the application perspective, they are fully functional HTTPS servers.

### Elements of the High Level Architecture
 - *Auth-Server* - Server generating authorization tokens; hosted in cloud and maintained by Beame
 - *L0 client* - developer level of credentials; publicly accessible host
 - *L1, L2 clients* - lower level of credentials; publicly accessible hosts
 - *Edge Server* - maintained by Beame transparent proxy servers

## Custom Provisioning Workflow

![provisioning workflow](img/ProvisioningClient.jpg)

*CPS* (Customer-managed Provisioning Server) credentials are pinned in the *Authorization Server*, during *CPS* deployment, prior to the first run of the service.

The custom provisioning process requires *Customer* to deploy *CPS*s and *Matching/Auth* servers with corresponding permissions under Customer's internal security policy.

The custom provisioning process uses the *Authorization Server* as single authorization point.

## Custom Client Provisioning Flow Chart

![provisioning flowchart](img/clientProvisionFlowchart.jpg)

### There are three interleaved flows in the provisioning process:
 - *Clerk Station Flow* - process takes place on the *Customer* provisioning station, controls the whole process;
 - *Matching/Auth Flow* - background process controlled by Customer’s *Matching/Authorization server*;
 - *Client Flow* - process that takes place on the mobile device. Requires corresponding mobile Beame SDK services.

# Mastering the Beame-SDK

## Beame CLI

If you have completed the ["Quick Start"](#quick-start) above, and know how your future application will look, you can feel free to use all of what's described below.
At any moment, using beame-sdk, you can see all credentials you currently own by running:
 - `beame creds list`

### Credentials

The following commands are used for acquiring and manipulating certificates.

* `beame creds show --fqdn fqdn [--format {text|json}]` - _print details for specified hostname(fqdn)_
* `beame creds list [--regex regex] [--format {text|json}]` - _list details of all credentials on this machine_
* `beame creds getCreds [--token token] --authSrvFqdn authSrvFqdn [--fqdn fqdn] [--name name] [--email email] [--format {text|json}]` - _request new credentials from Beame; intended to be called in two ways: 1st - by copy-paste a [command](#quick-start) from registration email; 2nd - by providing local fqdn_:  `beame creds getCreds --fqdn x5lidev3ovw302bb.v1.d.beameio.net`
* `beame creds updateMetadata --fqdn fqdn [--name name] [--email email] [--format {text|json}]` - _update your details for the specified fqdn_
* `beame creds shred --fqdn fqdn [--format {text|json}]` - _shred credentials for specified fqdn_
* `beame creds exportCredentials --fqdn fqdn --targetFqdn targetFqdn [--signingFqdn signingFqdn] [--file file]` - _encrypt specified credentials for particular target host_
* `beame creds importCredentials --file file` - _decypt and import credentials contained in specified file_
* `beame creds importLiveCredentials --fqdn fqdn` - _import credentials of any public domain to Beame store, you can see imported credential by calling:_ `beame creds list`
* `beame creds encrypt --data data [--fqdn fqdn] [--signingFqdn signingFqdn] [--format {text|json}]` - _encrypt specified data with RSA public key for specific fqdn; output is a json formatted string, containing details about target host. If signingFqdn is specified, output will contain RSA signature of data hash_
* `beame creds decrypt --data data` - _decrypt data (json string of specific format) with local RSA private key, entity that data was encrypted for, is specified in appropriate field in provided data. The operation will succeed, only if corresponding private key is found in local ~/.beame folder_
* `beame creds sign --data data --fqdn fqdn [--format {text|json}]` - _sign provided data with private key of specified fqdn, output is json in base64 format_
* `beame creds checkSignature --data data` - _check signature contained in provided data, with public key of specific fqdn, input data is base64 string, that contains json with specific key-value pairs (exact output of `beame creds sign`)_

### Running test server

* `beame servers runHelloWorldServer --fqdn clientFQDN` - run a "Hello World" HTTPS server for the specified hostname
* `beame.js servers runChatServer [--sharedFolder sharedFolder]` - run chat example for first hostname in creds list

### Beame.io CLI - encryption

* `beame crypto encrypt [--data data] [--fqdn fqdn]` - encrypts the given data so that only the owner of the specified entity can decrypt it
* `beame crypto decrypt [--fqdn fqdn] [--data data]` - decrypts the given data. You must be the owner of the given entity
* `beame crypto sign [--data data] [--fqdn fqdn]` - signs the given data as the specified entity
* `beame crypto _checkSignature [--fqdn fqdn] [--data data] --signature signature` - verifies the correctness of the signature

## Beame NodeJS API
[Extended JsDoc generated documentation - here](https://beameio.github.io/beame-sdk/index.html)

_The idea behind the Node.js SDK APIs is that you can employ Beame CLI functionality in your own Node.js project._

Receive publicly trusted cert with a pseudo-random routable hostname and run your new TLS(SSL) server in the same flow (or later, whenever you see it fit).

Current SDK release intends extensive CLI usage (see description above). So Node.js APIs provide a high level of access.

Be aware that API on each level requires credentials created on the previous/higher level:

To use any API from beame-sdk include
`var beameSDK = require ("beame-sdk");`

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

## Copy-paste examples

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
