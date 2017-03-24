module.exports = {

    CreatePlan : function (newPlan , UserID, DisplayName) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            console.log('Attempting to Insert new learning plan...');
            req.query("INSERT INTO dbo.Plans (PlanTitle, PlanTopic, OwnerID, OwnerName, PlanDetails, TargetLearners, LearningOutcomes, Links) VALUES ('" + newPlan.PlanTitle + "', '" + newPlan.PlanTopic + "', '" + UserID + "', '" + DisplayName + "', '" + newPlan.PlanDetails + "', '" + newPlan.TargetLearners + "', '" + newPlan.LearningOutcomes + "', '" + newPlan.Links + "');", function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Added one new learning plan");
                    console.log("The new plan title is " + newPlan.PlanTitle);
                }
                conn.close();
            });
        });
    },


    LoadAllPlans : function (callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.Plans;", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved Plan Data");
                    callback(recordset);
                }
                conn.close();
            });
        });
    },

    LoadAllPlanTopics : function (PlanTopicCue, callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT DISTINCT(PlanTopic) FROM dbo.Plans WHERE PlanTopic LIKE  '%" + PlanTopicCue.substr(0, 6).trim() + "%';", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved Plan Topic Data");
                    console.log(recordset);
                    callback(recordset);
                }
                conn.close();
            });
        });
    },

    LoadOwnedPlan : function (UserID, callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.Plans WHERE OwnerID = '" + UserID + "';", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved User Owned Plans");
                    callback(recordset);
                }
                conn.close();
            });
        });
    },

    LoadSpecificPlan : function (PlanTitle, callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.Plans WHERE PlanTitle = '" + PlanTitle + "';", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved Specific Plan with Title " + PlanTitle);
                    callback(recordset);
                }
                conn.close();
            });
        });
    },

    LoadSpecificPlanByID : function (PlanID, callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.Plans WHERE PlanID = '" + PlanID + "';", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved Specific Plan with ID = " + PlanID);
                    callback(recordset);
                }
                conn.close();
            });
        });
    },

    LoadSpecificPlanByLearningOutcomes : function (LearningOutcomes, callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.Plans WHERE LearningOutcomes = '" + LearningOutcomes + "';", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved Specific Plan with LearningOutcomes = " + LearningOutcomes);
                    callback(recordset);
                }
                conn.close();
            });
        });
    },

    LoadSpecificPlanByPlanTopic : function (PlanTopic, callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.Plans WHERE PlanTopic = '" + PlanTopic + "';", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved Specific Plan with Topic" + PlanTopic);
                    callback(recordset);
                }
                conn.close();
            });
        });
    },

    EnrollPlan : function (PlanID , UserID) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            console.log('Attempting to Insert new plan enrollment record...');
            req.query("INSERT INTO dbo.PlanEnrollment (PlanID, UserID) VALUES ('" + PlanID + "', '" + UserID + "');", function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Added one new enrollment record");
                }
                conn.close();
            });
        });
    },

    LoadEnrollmentRecord : function (UserID, callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.PlanEnrollment WHERE UserID = '" + UserID + "';", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved Enrollment Data");
                    callback(recordset);
                }
                conn.close();
            });
        });
    },

    CheckDuplicateEnrollment : function (PlanID, UserID, callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT * FROM dbo.PlanEnrollment WHERE UserID = '" + UserID + "' AND PlanID = '" + PlanID + "';", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Retrieved Enrollment Data for checking duplication");
                    callback(recordset);
                }
                conn.close();
            });
        });
    },

    CheckEnrolledPlanCompletion : function (UserID, callback) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            req.query("SELECT dbo.PlanEnrollment.PlanID, dbo.PlanEnrollment.UserID, dbo.PlanEnrollment.Completed, dbo.Plans.PlanTitle FROM dbo.PlanEnrollment LEFT JOIN dbo.Plans ON dbo.PlanEnrollment.PlanID = dbo.Plans.PlanID WHERE dbo.PlanEnrollment.UserID = " + UserID + ";", function (err, recordset) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Checked Plan Completion Record");
                    callback(recordset);
                }
                conn.close();
            });
        });
    }
}