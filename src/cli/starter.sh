#!/bin/bash/
npm config get prefix | sed -e 's/\\/\\\\/g' | awk '{print "node "$0"/lib/node_modules/beame-sdk/tests/server_tests/initRemoteEdgeClient.js"}' | sh

#export beame='./beame.js'
#export DEVELOPER_ID='xeb54z03ir93ngdu.v1.beameio.net'
#export APP_ID='o6h2837uh3o4pe47.xeb54z03ir93ngdu.v1.beameio.net'
#export INSTANCE_ID='ti61mioq368nfplj.v1.r.d.edge.eu-central-1a-1.v1.beameio.net'


#$beame creds list  --type developer --fqdn $DEVELOPER_ID --format json
#$beame creds list  --type developer --fqdn $DEVELOPER_ID --format text
#$beame creds list  --type atom --fqdn $APP_IDD --format text
#$beame creds list  --type atom --fqdn $APP_IDD --format json
#$beame creds list  --type instance --fqdn $INSTANCE_ID --format text
#$beame creds list  --type instance --fqdn $INSTANCE_ID --format json

#$beame creds create --type developer --fqdn $DEVELOPER_ID --format json
#$beame creds create --type developer --fqdn $DEVELOPER_ID --format text
#$beame creds create --type atom --fqdn $DEVELOPER_ID --format text
#$beame creds create --type atom --fqdn $DEVELOPER_ID --format json
#$beame creds create --type instance --fqdn $APP_ID --format text
#$beame creds create --type instance --fqdn $APP_ID --format json
#
#beame creds create --type atom $DEVELOPER_ID --format text
#beame creds create --type atom $DEVELOPER_ID --format json
#beame creds create --type instance $APP_ID --format text
#beame creds create --type instance $APP_ID --format json
#beame creds create --type instance $APP_ID --format json
#
#
#beame creds renew  --type {developer|atom|instance} jdafskljdasjkldsa.beameio.net} --format {json|text} 
#beame creds purge  --type {developer|atom|instance} --localip { ipaddress | auto } --format {json|text}
#
#eame creds list   --type developer
#|ato
#|instance jdafskljdasjkldsa.beameio.net  --format {json|text} 
#
#beame creds create --type {developer|atom|instance} --localip { ipaddress | auto } --format {json|text} 
#beame creds renew  --type {developer|atom|instance} jdafskljdasjkldsa.beameio.net} --format {json|text} 
#beame creds purge  --type {developer|atom|instance} --localip { ipaddress | auto } --format {json|text}


