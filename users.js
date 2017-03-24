module.exports = {

    InsertNewfbRecord: function (fb_id, fb_email, fb_displayname, fb_gender, fb_propic) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        sql.connect(config).then(function () {
            console.log('Attempting to Insert records...');
            new sql.Request().query
            ("INSERT INTO dbo.FBuser (fb_id, fb_email, fb_displayname, fb_gender, fb_profilepic) VALUES ('" + fb_id + "', '" + fb_email + "', '" + fb_displayname + "', '" + fb_gender + "', '" + fb_propic + "');");

            console.log("Added one new record");
            console.log("The new username is " + fb_displayname);
        });
    },

    fbUserExist: function (fb_id, fb_email, fb_displayname, fb_gender, fb_propic, callback) {

        function isEmptyObject(obj) {
            return !Object.keys(obj).length;
        }

        function isEmptyObject(obj) {
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    return false;
                }
            }
            return true;
        }

        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        sql.connect(config).then(function () {
            console.log('Connected to DB');
            new sql.Request().query("SELECT * FROM dbo.FBuser WHERE fb_id = '" + fb_id + "';")
                .then(function (recordset) {
                    if (isEmptyObject(recordset)) {
                        console.log("The User does not exist, ready to insert");
                        callback(fb_id, fb_email, fb_displayname, fb_gender, fb_propic);
                    } else {
                        console.log("The user is existed already.");
                    }
                }).catch(function (err) {
                    //When errors come
                });
        });
    },


    InsertNewRecord: function (User) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        sql.connect(config).then(function () {
            console.log('Attempting to Insert records...');
            new sql.Request().query
            ("INSERT INTO dbo.LocalUser (Username, Password, DisplayName, Email, Gender) VALUES ('" + User.Username + "', '" + User.Password + "', '" + User.DisplayName + "', '" + User.Email + "', '" + User.Gender + "');");
            console.log("Added one new record");
            console.log("The new User is " + User.DisplayName);
        });
    },

    // Demo of Select Query in Database
    UserExist: function (User, callback) {

        // These two functions check if the fetched records are empty, that is nothing is fetched, just copy, no need to change
        function isEmptyObject(obj) {
            return !Object.keys(obj).length;
        }

        function isEmptyObject(obj) {
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    return false;
                }
            }
            return true;
        }

        // These are the variables and settings to connect to azure sql, the configuration are fetched from the file. config.js, the folder structure needs to be the same, please refer to it
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        sql.connect(config).then(function () {
            console.log('Connected to DB');
            //SELECT statement
            new sql.Request().query("SELECT * FROM dbo.LocalUser WHERE Username = '" + User.Username + "';")
                .then(function (recordset) {
                    if (isEmptyObject(recordset)) {
                        console.log("The User does not exist");
                        callback(User);
                    } else {
                        console.log("The user is existed.");
                        callback();
                    }
                }).catch(function (err) {
                    //When errors come
                });
        });
    },

    LoginSuccess : function (User, callback) {

        function isEmptyObject(obj) {
            return !Object.keys(obj).length;
        }

        function isEmptyObject(obj) {
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    return false;
                }
            }
            return true;
        }
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');

        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.LocalUser WHERE Username = '" + User.Username + "' AND Password = '" + User.Password + "';", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else if (!isEmptyObject(recordset)) {
                    console.log("An existing user is found");
                    callback(recordset);
                } else {
                    console.log("No existing user is found");
                    callback(recordset);
                }
                conn.close();
            });
        });
    },
};