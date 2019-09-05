* Go over this list and add new points if relevant
* Update provision servers
	* Update DB Schema
	* Update code
* Check out beame-sdk `master` branch
* Merge the `dev` branch into the `master` branch
* run tests
* Make sure email text sent by provision matches the SDK
* `npm version patch` or change version on `package.json`
* `git tag` the master branch with the `cat package.json | jq .version -r` version and push the tag
* `npm publish`