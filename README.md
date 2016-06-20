# TestEnvironment
To use tests from this repo, first run "npm install beame-provision-test"
APIs called here, should be called in strict sequence:
Here call examples:

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

