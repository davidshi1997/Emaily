
var crypto 		= require('crypto');
var MongoDB 	= require('mongodb').MongoClient;
var Server 		= require('mongodb').Server;
var moment 		= require('moment');

/*
	ESTABLISH DATABASE CONNECTION
*/

var dbName = process.env.DB_NAME || 'node-login';
var dbHost = process.env.DB_HOST || 'localhost'
var dbPort = process.env.DB_PORT || 27017;

// hardcode the EF out of this
var dbURI = 'mongodb://heroku_4lzr58pg:ltfaumlgu4lrnmnu8r8rmqkf3m@ds151697.mlab.com:51697/heroku_4lzr58pg'

MongoDB.connect(dbURI, function(err, db) {
	db.open(function(e, d){
		if (e) {
			console.log(e);
		} else {
			if (process.env.NODE_ENV == 'live') {
				db.authenticate(process.env.DB_USER, process.env.DB_PASS, function(e, res) {
					if (e) {
						console.log('mongo :: error: not authenticated', e);
					}
					else {
						console.log('mongo :: authenticated and connected to database :: "'+dbName+'"');
					}
				});
			}	else{
				console.log('mongo :: connected to database :: "'+dbName+'"');
			}
		}
	});

	accounts = db.collection('users');
});

/* login validation methods */

// exports.autoLogin = function(user, pass, callback)
// {
// 	accounts.findOne({user:user}, function(e, o) {
// 		if (o){
// 			o.pass == pass ? callback(o) : callback(null);
// 		}	else{
// 			callback(null);
// 		}
// 	});
// }

exports.manualLogin = function(userId, user, pass, callback)
{
	accounts.findOne({userId:userId}, function(err, o) {
		// User not found, should've been created by Emaily on fb, something's wrong with the token
		if (err || o == null){
			callback('user-not-found'); // should not be found tho
		} else {
			saltAndHash(pass, function(hash){
				o.email = user;
				o.pass = hash;
				accounts.save(o, {safe: true}, function(e) {
					if (e) callback(e);
					else callback(null, o);
				});
			});
		}
	});
}

/* record insertion, update & deletion methods */

exports.addNewAccount = function(newData, callback)
{
	accounts.findOne({user:newData.user}, function(e, o) {
		if (o){
			callback('username-taken');
		}	else{
			accounts.findOne({email:newData.email}, function(e, o) {
				if (o){
					callback('email-taken');
				}	else{
					saltAndHash(newData.pass, function(hash){
						newData.pass = hash;
					// append date stamp when record was created //
						newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
						accounts.insert(newData, {safe: true}, callback);
					});
				}
			});
		}
	});
}

exports.updateAccount = function(newData, callback)
{
	accounts.findOne({_id:getObjectId(newData.id)}, function(e, o){
		o.name 		= newData.name;
		o.email 	= newData.email;
		o.country 	= newData.country;
		if (newData.pass == ''){
			accounts.save(o, {safe: true}, function(e) {
				if (e) callback(e);
				else callback(null, o);
			});
		}	else{
			saltAndHash(newData.pass, function(hash){
				o.pass = hash;
				accounts.save(o, {safe: true}, function(e) {
					if (e) callback(e);
					else callback(null, o);
				});
			});
		}
	});
}

exports.updatePassword = function(email, newPass, callback)
{
	accounts.findOne({email:email}, function(e, o){
		if (e){
			callback(e, null);
		}	else{
			saltAndHash(newPass, function(hash){
		        o.pass = hash;
		        accounts.save(o, {safe: true}, callback);
			});
		}
	});
}

/* account lookup methods */

exports.deleteAccount = function(id, callback)
{
	accounts.remove({_id: getObjectId(id)}, callback);
}

exports.getAccountByEmail = function(email, callback)
{
	accounts.findOne({email:email}, function(e, o){ callback(o); });
}

exports.validateResetLink = function(email, passHash, callback)
{
	accounts.find({ $and: [{email:email, pass:passHash}] }, function(e, o){
		callback(o ? 'ok' : null);
	});
}

exports.getAllRecords = function(callback)
{
	accounts.find().toArray(
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
}

exports.delAllRecords = function(callback)
{
	accounts.remove({}, callback); // reset accounts collection for testing //
}

/* private encryption & validation methods */

var generateSalt = function()
{
	var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
	var salt = '';
	for (var i = 0; i < 10; i++) {
		var p = Math.floor(Math.random() * set.length);
		salt += set[p];
	}
	return salt;
}

var sha = function(str) {
	return crypto.createHash('sha256').update(str).digest('base64');
}

var saltAndHash = function(pass, callback)
{
	var salt = generateSalt();
	callback(salt + sha(pass + salt));
}

var validatePassword = function(plainPass, hashedPass, callback)
{
	var salt = hashedPass.substr(0, 10);
	var validHash = salt + sha(plainPass + salt);
	callback(null, hashedPass === validHash);
}

var getObjectId = function(id)
{
	return new require('mongodb').ObjectID(id);
}

var findById = function(id, callback)
{
	accounts.findOne({_id: getObjectId(id)},
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
}

var findByMultipleFields = function(a, callback)
{
// this takes an array of name/val pairs to search against {fieldName : 'value'} //
	accounts.find( { $or : a } ).toArray(
		function(e, results) {
		if (e) callback(e)
		else callback(null, results)
	});
}
