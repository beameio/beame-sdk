/**
 * Created by zglozman on 7/9/16.
 */

var BeameStore = require("../../src/services/BeameStore");
var debug =require("debug")("CliGlobal");

var store = new BeameStore();

var currentDevelopers = store.listCurrentDevelopers();
var currentAtoms = store.listCurrentAtoms();
var currentInstances = store.listCurrentEdges();
