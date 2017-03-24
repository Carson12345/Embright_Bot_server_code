module.exports = {

    AddResource : function (newResource, PlanID) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            console.log('Attempting to Insert new resource...');
            req.query("INSERT INTO dbo.Resources (PlanID, ResourceTitle, ResourceTopic, ResourceType, ResourceDescription, ResourceURL) VALUES ('" + PlanID + "', '" + newResource.ResourceTitle + "', '" + newResource.ResourceTopic + "', '" + newResource.ResourceType + "', '" + newResource.ResourceDescription + "', '" + newResource.ResourceURL + "');", function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Added one new resource");
                    console.log("The new resource title is " + newResource.ResourceTitle + "and the corresponding plan is " + newResource.PlanTitle);
                }
                conn.close();
            });
        });
    },

    LoadSinglePlanResource : function (PlanID, callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.Resources WHERE PlanID = '" + PlanID + "';", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved Resource Data");
                    callback(recordset);
                }
                conn.close();
            });
        });
    },

    LoadAllResources : function (callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.Resources;", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved All Resource Data");
                    callback(recordset);
                }
                conn.close();
            });
        });
    }
};
