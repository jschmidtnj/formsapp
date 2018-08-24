const functions = require('firebase-functions');
const config = require('./config/config');
const mailjet = require('node-mailjet').connect(config.mailjet.mailjetapikey, config.mailjet.mailjetapisecret);
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(config.firebaseadmin),
    databaseURL: config.other.databaseurl
});
const promisePool = require('es6-promise-pool');
const PromisePool = promisePool.PromisePool;
const secureCompare = require('secure-compare');
const fs = require('fs');
//const path = require('path');

var approvalNotificationEmailData = config.approvalNotificationEmailData;
var approvalNotificationTemplate;
//see https://stackoverflow.com/questions/9749114/getting-node-js-to-read-files-in-html-format/9749164
fs.readFile(__dirname + "/htmltemplates/approvalNotification.html", "utf8", (err, html) => {
    if (err !== "") {
        approvalNotificationTemplate = html;
        //console.log(approvalNotificationTemplate);
    }
});

var approvedNotificationEmailData = config.approvedNotificationEmailData;
var approvedNotificationTemplate;
fs.readFile(__dirname + "/htmltemplates/approvedNotification.html", "utf8", (err, html) => {
    if (err !== "") {
        approvedNotificationTemplate = html;
        //console.log(approvedNotificationTemplate);
    }
});

var rejectedNotificationEmailData = config.rejectedNotificationEmailData;
var rejectedNotificationTemplate;
fs.readFile(__dirname + "/htmltemplates/rejectedNotification.html", "utf8", (err, html) => {
    if (err !== "") {
        rejectedNotificationTemplate = html;
        //console.log(rejectedNotificationTemplate);
    }
});

const indexaddress = config.other.indexaddress;
const logoimagesrc = indexaddress + config.other.logoimagesrc;
const heroimagesrc = indexaddress + config.other.heroimagesrc;
const privacypolicyurl = config.other.privacypolicyurl;
const termsofserviceurl = config.other.termsofserviceurl;
const address = config.other.address;
const phonenumber = config.other.phonenumber;

var onedaymilli = 24 * 60 * 60 * 1000;
var daysofinactivity = parseInt(config.other.daysofinactivity);

exports.sendApprovalEmailNotification = functions.https.onCall((data, context) => {
    const responseId = data.responseId;
    const formId = data.formId;
    //console.log(responseId, formId);
    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    const sendername = context.auth.token.name || null;
    //const picture = context.auth.token.picture || null;
    const senderemail = context.auth.token.email || null;
    //console.log(uid, sendername, senderemail);
    var db = admin.database();
    db.ref("forms/" + formId).on("value", (formData) => {
        var formDataVal = formData.val();
        var formName = formDataVal.name;
        db.ref("responses/" + formId + "/" + responseId).on("value", (responseData) => {
            var responseDataVal = responseData.val();
            //console.log(responseDataVal);
            var notificationstatus = responseDataVal.notificationstatus;
            //console.log(notificationstatus);
            if (notificationstatus === "pending") {
                //console.log("need to send notifications");
                var currentWorkflow = responseDataVal.currentWorkflow;
                //console.log(currentWorkflow);
                var currentWorkflowArr = currentWorkflow.split(',').map((item) => {
                    return item.trim();
                });
                //console.log(currentWorkflowArr);
                var emailcount = 0;
                var emailsSent = [];
                var emailsSentCount = 0;
                for (var i = 0; i < currentWorkflowArr.length; i++) {
                    var emailAddr = currentWorkflowArr[i];
                    //console.log(emailAddr);
                    db.ref().child('users').orderByChild('email').equalTo(emailAddr).on("child_added", (userData) => {
                        var userDataVal = userData.val();
                        //console.log(userDataVal);
                        var notificationsettings = userDataVal.notificationsettings;
                        //console.log(notificationsettings);
                        var emailapprove = userDataVal.notificationsettings.emailapprove;
                        if (emailapprove === true) {
                            //console.log("send email to " + currentWorkflowArr[emailcount]);
                            approvalNotificationEmailData.Recipients = [{
                                'Email': currentWorkflowArr[emailcount]
                            }];
                            var recipientname = userDataVal.name;
                            var viewsubmissionurl = indexaddress + "view.html?mode=response&formid=" + formId + "&responseid=" + responseId;
                            //console.log("template: " + approvalNotificationTemplate);
                            var personalizedtemplate = approvalNotificationTemplate.replace("{{sendername}}", sendername).replace("{{sendername}}", sendername).replace("{{formname}}", formName)
                                .replace("{{recipientname}}", recipientname).replace("{{logoimagesrc}}", logoimagesrc).replace("{{heroimagesrc}}", heroimagesrc)
                                .replace("{{indexaddress}}", indexaddress).replace("{{privacypolicyurl}}", privacypolicyurl).replace("{{termsofserviceurl}}", termsofserviceurl)
                                .replace("{{address}}", address).replace("{{phonenumber}}", phonenumber).replace("{{viewsubmissionurl}}", viewsubmissionurl);

                            approvalNotificationEmailData['Html-Part'] = personalizedtemplate;
                            var personalizedSubject = sendername + " requests your approval, having submitted the " + formName + " form";
                            approvalNotificationEmailData.Subject = personalizedSubject;
                            //console.log(approvalNotificationEmailData);
                            emailsSent.push(currentWorkflowArr[emailcount]);
                            //console.log(emailsSent);

                            //figured out error - it's because only google services are allowed in spark plan for firebase (see https://github.com/mailjet/mailjet-apiv3-nodejs/issues/30)
                            mailjet.post('send').request(approvalNotificationEmailData).then(() => {
                                console.log("successfully sent email to " + emailsSent[emailsSentCount]);
                                emailsSentCount++;
                                return null;
                            }).catch((err) => {
                                console.log(err.ErrorMessage);
                                throw new Error(err.ErrorMessage);
                            });

                        } else {
                            //console.log("don't send email to " + currentWorkflowArr[emailcount]);
                        }
                        emailcount++;
                    });
                }
                //set notificationstatus to sent
                db.ref("responses/" + formId + "/" + responseId).update({
                    notificationstatus: "sent"
                });
            } else if (notificationstatus === "sent") {
                //console.log("notifications sent already");
            }
        }, (errorObject) => {
            console.log("The read failed: " + errorObject.code);
            console.log("could not get response data");
        });
    }, (errorObject) => {
        console.log("The read failed: " + errorObject.code);
        console.log("could not get form data");
    });
    var status = "email sent";
    // returning result status.
    return {
        status: status
    };
});

exports.sendApprovedRejectedEmailNotification = functions.https.onCall((data, context) => {
    const responseId = data.responseId;
    const formId = data.formId;
    //console.log(responseId, formId);
    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    const sendername = context.auth.token.name || null;
    //const picture = context.auth.token.picture || null;
    const senderemail = context.auth.token.email || null;
    //console.log(uid, sendername, senderemail);
    var db = admin.database();
    db.ref("forms/" + formId).on("value", (formData) => {
        var formDataVal = formData.val();
        var formName = formDataVal.name;
        db.ref("responses/" + formId + "/" + responseId).on("value", (responseData) => {
            var responseDataVal = responseData.val();
            //console.log(responseDataVal);
            var notificationstatus = responseDataVal.notificationstatus;
            var responsestatus = responseDataVal.status;
            //console.log(notificationstatus, responsestatus);
            if (notificationstatus === "pending" && (responsestatus === "approved" || responsestatus === "rejected")) {
                //console.log("need to send notifications");
                var userIdOfSubmitter = responseDataVal.userId;
                //console.log(userIdOfSubmitter);
                db.ref("users/" + userIdOfSubmitter).on("value", (userData) => {
                    var userDataVal = userData.val();
                    //console.log(userDataVal);
                    var recipientEmail = userDataVal.email;
                    //console.log("send email to " + recipientEmail);
                    var recipientname = userDataVal.name;
                    var personalizedSubject = name + " approved your submission to the " + formName + " form";
                    var personalizedtemplate;
                    if (responsestatus === "approved") {
                        approvedNotificationEmailData.Recipients = [{
                            'Email': recipientEmail
                        }];
                        //console.log("template: " + approvedNotificationTemplate);
                        personalizedtemplate = approvedNotificationTemplate.replace("{{sendername}}", sendername).replace("{{sendername}}", sendername).replace("{{formname}}", formName)
                            .replace("{{recipientname}}", recipientname).replace("{{logoimagesrc}}", logoimagesrc).replace("{{heroimagesrc}}", heroimagesrc)
                            .replace("{{indexaddress}}", indexaddress).replace("{{privacypolicyurl}}", privacypolicyurl).replace("{{termsofserviceurl}}", termsofserviceurl)
                            .replace("{{address}}", address).replace("{{phonenumber}}", phonenumber).replace("{{viewsubmissionurl}}", viewsubmissionurl);
                        approvedNotificationEmailData['Text-Part'] = personalizedtemplate;
                        approvedNotificationEmailData.Subject = personalizedSubject;
                        //console.log(approvedNotificationEmailData);

                        //figured out error - it's because only google services are allowed in spark plan for firebase (see https://github.com/mailjet/mailjet-apiv3-nodejs/issues/30)
                        mailjet.post('send').request(approvedNotificationEmailData).then(() => {
                            console.log("successfully sent approved email to " + recipientEmail);
                            return null;
                        }).catch((err) => {
                            console.log(err.ErrorMessage);
                            throw new Error(err.ErrorMessage);
                        });

                    } else if (responsestatus === "rejected") {
                        var rejectcomment = responseDataVal.comment;
                        //console.log(rejectcomment);
                        personalizedSubject = sendername + " rejected your submission to the " + formName + " form";
                        rejectedNotificationEmailData.Recipients = [{
                            'Email': emailSubmitter
                        }];
                        //console.log("template: " + rejectedNotificationTemplate);
                        personalizedtemplate = rejectedNotificationTemplate.replace("{{sendername}}", sendername).replace("{{sendername}}", sendername).replace("{{formname}}", formName)
                            .replace("{{recipientname}}", recipientname).replace("{{logoimagesrc}}", logoimagesrc).replace("{{heroimagesrc}}", heroimagesrc)
                            .replace("{{indexaddress}}", indexaddress).replace("{{privacypolicyurl}}", privacypolicyurl).replace("{{termsofserviceurl}}", termsofserviceurl)
                            .replace("{{address}}", address).replace("{{phonenumber}}", phonenumber).replace("{{viewsubmissionurl}}", viewsubmissionurl)
                            .replace("{{rejectcomment}}", rejectcomment);

                        rejectedNotificationEmailData['Text-Part'] = personalizedtemplate;
                        rejectedNotificationEmailData.Subject = personalizedSubject;
                        //console.log(rejectedNotificationEmailData);

                        //figured out error - it's because only google services are allowed in spark plan for firebase (see https://github.com/mailjet/mailjet-apiv3-nodejs/issues/30)
                        mailjet.post('send').request(rejectedNotificationEmailData).then(() => {
                            console.log("successfully sent rejection email to " + emailSubmitter);
                            return null;
                        }).catch((err) => {
                            console.log(err.ErrorMessage);
                            throw new Error(err.ErrorMessage);
                        });

                    }
                });
                //set notificationstatus to sent
                db.ref("responses/" + formId + "/" + responseId).update({
                    notificationstatus: "sent"
                });
            } else if (notificationstatus === "sent") {
                console.log("notifications sent already");
            }
        }, (errorObject) => {
            console.log("The read failed: " + errorObject.code);
            console.log("could not get response data");
        });
    }, (errorObject) => {
        console.log("The read failed: " + errorObject.code);
        console.log("could not get form data");
    });
    var status = "email sent";
    // returning result status.
    return {
        status: status
    };
});

//see https://github.com/firebase/functions-samples/tree/master/delete-unused-accounts-cron for more details
exports.accountcleanup = functions.https.onRequest((req, res) => {
    //console.log("cleaning up users");
    //console.log(config.other);
    var MAX_CONCURRENT = parseInt(config.other.maxconcurrentaccountdeletions);
    //console.log(MAX_CONCURRENT);
    const key = req.query.key;
    // Exit if the keys don't match.
    if (!secureCompare(key, functions.config().cron.key)) {
        console.log('The key provided in the request does not match the key set in the environment. Check that', key,
            'matches the cron.key attribute in `firebase env:get`');
        res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
            'cron.key environment variable.');
        return null;
    }

    // Fetch all user details.
    return getInactiveUsers().then((inactiveUsers) => {
        // Use a pool so that we delete maximum `MAX_CONCURRENT` users in parallel.
        const promisePool = new PromisePool(() => deleteInactiveUser(inactiveUsers), MAX_CONCURRENT);
        return promisePool.start();
    }).then(() => {
        //console.log('User cleanup finished');
        res.send('User cleanup finished');
        return null;
    });
});

/**
 * Deletes one inactive user from the list.
 */
function deleteInactiveUser(inactiveUsers) {
    if (inactiveUsers.length > 0) {
        const userToDelete = inactiveUsers.pop();

        // Delete the inactive user.
        return admin.auth().deleteUser(userToDelete.uid).then(() => {
            admin.database().ref("users/" + userToDelete.uid).remove();
            //console.log('Deleted user account', userToDelete.uid, 'because of inactivity and email is not verified');
            return null;
        }).catch(error => {
            console.error('Deletion of inactive user account', userToDelete.uid, 'failed:', error);
            return null;
        });
    }
    return null;
}

/**
 * Returns the list of all inactive users.
 */
function getInactiveUsers(users = [], nextPageToken) {
    return admin.auth().listUsers(1000, nextPageToken).then((result) => {
        // Find users that have not signed in in the last 30 days.
        const inactiveUsers = result.users.filter(
            user => Date.parse(user.metadata.lastSignInTime) < (Date.now() - onedaymilli * daysofinactivity) && !(user.emailVerified));
        /*
        const activeUsers = result.users.filter(
            user => Date.parse(user.metadata.lastSignInTime) >= (Date.now() - onedaymilli * daysofinactivity) && user.emailVerified);
        //console.log("active users:");
        //console.log(activeUsers);
        for (var i = 0; i < activeUsers.length; i++) {
            //console.log(activeUsers[i].email);
            //console.log(Date.parse(activeUsers[i].metadata.lastSignInTime));
            //console.log(Date.now() - 30 * 24 * 60 * 60 * 1000);
            //console.log("email verified: " + !(activeUsers[i].emailVerified));
            //console.log("date config: " + Date.parse(activeUsers[i].metadata.lastSignInTime) < (Date.now() - onedaymilli * config.other.daysofinactivity));
        }
        */
        // Concat with list of previously found inactive users if there was more than 1000 users.
        /*
        //console.log("inactive users:");
        if (inactiveUsers.length > 0) {
            //console.log(inactiveUsers);
        }
        for (var i = 0; i < inactiveUsers.length; i++) {
            //console.log(inactiveUsers[i].email);
        }
        */
        users = users.concat(inactiveUsers);
        //console.log(users);
        // If there are more users to fetch we fetch them.
        if (result.pageToken) {
            return getInactiveUsers(users, result.pageToken);
        }
        return users;
    });
}