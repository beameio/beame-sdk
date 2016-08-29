* Go over this list and add new points if relevant
* Update provision servers
	* Update DB Schema
	* Update code
* Check out beame-sdk `prod` branch
* Merge the `master` branch into the `prod` branch
* `git diff master prod` - see that there are only small differences
* run tests
* `npm shrinkwrap`
* Make sure `config/ApiConfig.json` and `config/Config.js` are correct
* Make sure email text sent by provision matches the SDK
* `npm version patch`
* `npm publish`
* `git tag` the prod branch with the `cat package.json | jq .version -r` version and push the tag
