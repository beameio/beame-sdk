/**
 * Created by zenit1 on 19/07/2016.
 */
"use strict";

var config = require('../test_config');
var options = config.options;
var developerTest = require('./developer_test');
var atomTest = require('./atom_test');
var edgeTest = require('./edge_test');

var run = function(){
	describe("Testing full flow", function () {

		describe('Testing Developer process', developerTest.run);

		for (var i = 0; i < options.developer_atoms; i++) {
			describe('Testing Atom process', function () {
				atomTest.run();
				for (var j = 0; j < options.atom_edges; j++) {
					describe('Testing Edge process', edgeTest.run);

				}
			});
		}
	});
} ;

module.exports ={run};