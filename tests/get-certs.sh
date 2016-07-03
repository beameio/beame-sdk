#!/usr/bin/env bash
set -eu

#queryEnv()
#{
#	instanceData=$(curl -s "http://$1/instance")
#	softwareConf=$(curl -s "http://$1/software")
#	version=$(echo "$softwareConf" | jq .version -r)
#	endpoint=$(echo "$instanceData" | jq .instanceData.endpoint -r)
#	instanceId=$(echo "$instanceData" | jq .instanceData.instanceid -r)
#	IP=$(echo "$instanceData" | jq .instanceData.publicipv4 -r)
#AZ=$(echo "$instanceData" | jq .instanceData.avlZone -r)
#
#	printf "   %-10s\t %-15s \t %-25s \t %-25s \t %-15s\r\n" "$instanceId"  "$version" "$endpoint" "$IP" "$AZ"
#}
#
#print_envieroment_lines()
#{
#	# echo "Env:" $1
#	echo "$1"
#	echo ""
#	printf "   %-10s\t %-15s \t %-25s \t\t %-25s\t %-15s\r\n" "instanceId" "version" "endpoint" "IP" "AZ"
#	echo ""
#	# printf ":%15s \t %25s \t\t %25s \t %15s\r\n" "_________" "__________" "__________" "__________"
#
#	while read ip; do
#		queryEnv $ip
#	done
#	# echo "--------------------------------------end---------------------------"
#	echo ""
#	echo ""
#}
#
#queryActiveEnvs()
#{
#	envs=('lb-all.luckyqr.io'  'lb-dev.luckyqr.io')
#
for (( c=1; c<=50; c++ ))
do
	echo "starting the proccess"
	node 'tests/testFullCycle.js' > 'outputLog'$c'.log' &
done


#for i in "${envs[@]}"; do
#		echo "Running for " "$i"
#		dig +short $i | print_envieroment_lines $i
#	done
#}
#
#queryActiveEnvs

