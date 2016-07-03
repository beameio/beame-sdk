function test1(name, gender, huj){
	console.log("In test1 function", arguments);
};

function start(){
	console.log("start arguemtns", arguments);
	var args = Array.prototype.slice.call(arguments);
	test1.apply(null, args);
};

module.exports = start;
