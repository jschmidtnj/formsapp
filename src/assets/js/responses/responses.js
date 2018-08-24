var jQuery = require("jquery");
require("popper.js");
require("bootstrap");
window.$ = window.jQuery = jQuery;
require('datatables.net-bs4');
require('datatables.net-responsive-bs4');
require('datatables.net-bs4/css/dataTables.bootstrap4.min.css');
require('datatables.net-responsive-bs4/css/responsive.bootstrap4.min.css');

var config = require('../../../config/config.json');
var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");

firebase.initializeApp(config.firebase);

function handleError(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    //console.log(errorCode, errorMessage);
    var customMessage = "";
    if (errorCode == "auth/notsignedin" || errorCode == "data/no-data") {
        customMessage = errorMessage;
    }
    if (error.code !== "" && error.message !== "") {
        if (customMessage !== "") {
            $('#error-info').text(customMessage);
        } else {
            $('#error-info').text("Error: " + errorMessage + " Code: " + errorCode);
        }
    } else {
        $('#error-info').text("No Error code found.");
    }
    $('#alertsignoutfailure').fadeIn();
    setTimeout(function () {
        $('#alertsignoutfailure').fadeOut();
    }, config.other.alerttimeout);
}

function getResponseData() {
    var ranonce = false;
    var datatablegenerated = false;

    function generateDataTableResponses() {
        if (!(ranonce)) {
            $("#noresponseswarning").removeClass("collapse");
            $("#responsedatalistcollapse").addClass("collapse");
        } else {
            if (!(datatablegenerated)) {
                datatablegenerated = true;
                $("#noresponseswarning").addClass("collapse");
                $("#responsedatalistcollapse").removeClass("collapse");
                $('#responsedatalist').DataTable({
                    responsive: true,
                    order: [
                        [2, "asc"]
                    ]
                });
            }
        }
    }
    firebase.database().ref('users/' + window.userId + '/responses').limitToFirst(config.other.responseviewmax).once('value').then(function (formIds) {
        var numFormIds = formIds.numChildren();
        var formcount = 0;
        var responsecount = 0;
        var allresponseIdKeys = [];
        formIds.forEach(function (form) {
            var formResponseValue = form.val();
            //console.log(formResponseValue);
            var formId = form.key;
            //console.log(formId);
            responseIdKeys = [];
            for (var responseIdKey in formResponseValue) {
                //console.log(responseIdKey);
                responseIdKeys.push(responseIdKey);
            }
            //console.log(responseIdKeys);
            allresponseIdKeys.push(responseIdKeys);
            //console.log(allresponseIdKeys);
            var numResponseIdKeys = responseIdKeys.length;
            //console.log(numResponseIdKeys);
            for (var i = 0; i < numResponseIdKeys; i++) {
                firebase.database().ref('forms/' + formId).once('value').then(function (form) {
                    //console.log(formcount, responsecount);
                    var responseid = allresponseIdKeys[formcount][responsecount];
                    //console.log(responseid);
                    var userId = window.userId;
                    //console.log(userId);
                    var formName = "";
                    var bodydatastring = "<tr>";
                    var formData = form.val();
                    //console.log(formData);
                    formName = formData.name;
                    //console.log(formName);
                    bodydatastring = bodydatastring + '<td>' + formName + '</td>';
                    var responsestatus = formResponseValue[responseid].status;
                    //console.log("status: " + responsestatus);
                    responsestatusstring = "";
                    var responsecomment = formResponseValue[responseid].comment;
                    //console.log("comment: " + responsecomment);
                    if (responsestatus == "pending") {
                        //console.log("pending status");
                        responsestatusstring = "<p>Pending</p>";
                    } else if (responsestatus == "approved") {
                        //console.log("approved status");
                        responsestatusstring = "<p>Approved</p>";
                    } else if (responsestatus == "rejected") {
                        //console.log("rejected status");
                        responsestatusstring = "<p>Rejected";
                        if (responsecomment !== "" && responsecomment !== undefined && responsecomment !== null) {
                            responsestatusstring = responsestatusstring + ". comment: " + responsecomment;
                        }
                        responsestatusstring = responsestatusstring + "</p>";
                    }
                    //console.log(responsestatusstring);
                    bodydatastring = bodydatastring + '<td>' + responsestatusstring + '</td>';
                    var timesubmitted = formResponseValue[responseid].time;
                    //console.log("time: " + timesubmitted);
                    var utctime = new Date(timesubmitted);
                    var timedata = utctime.toString();
                    //console.log(time);
                    bodydatastring = bodydatastring + '<td>' + timedata + '</td>';
                    bodydatastring = bodydatastring + "<td><button value=\"" + formId + "," + responseid +
                        "\" class=\"formView btn btn-primary btn-block onclick=\"void(0)\"\">View</button></td></tr>";

                    //bodydatastring = bodydatastring + "<td><button value=\"" + formId + "," + responseid + 
                    //"\" class=\"responseDelete btn btn-primary btn-block onclick=\"void(0)\"\">Delete</button></td></tr>";

                    if (!(ranonce)) {
                        ranonce = true;
                        var headerdatastring = "<th>Name</th><th>Status</th><th>Date</th><th>View</th>";
                        $('#responsedataheaderrow').append(headerdatastring);
                    }
                    $('#responsedatabody').append(bodydatastring);
                    //console.log(responsecount, allresponseIdKeys[formcount].length - 1, formcount, numFormIds - 1);
                    if (responsecount == allresponseIdKeys[formcount].length - 1) {
                        if (formcount == numFormIds - 1) {
                            generateDataTableResponses();
                        } else {
                            formcount++;
                            responsecount = 0;
                        }
                    } else {
                        responsecount++;
                    }
                })/*.catch(function (error) {
                    handleError(error);
                })*/;
            }
        });
        setTimeout(function () {
            generateDataTableResponses();
        }, config.other.datatimeout);
    }).catch(function (error) {
        handleError(error);
    });
}

/*
function deleteSubmission() {
    var valueArray = $(this).attr('value').split(',');
    var formId = valueArray[0];
    var responseid = valueArray[1];
    var started = false;

    function deleteForm() {
        var user = firebase.auth().currentUser;
        if (user) {
            window.userId = user.uid;
            //console.log("delete the response");
            firebase.database().ref('responses/' + formId + '/' + responseid).remove().then(function () {
                //console.log(window.userId, formId, responseid);
                firebase.database().ref('users/' + window.userId + '/responses/' + formId + '/' + responseid).remove().then(function () {
                    $("#responsedatabody").remove();
                    $("#responsedataheaderrow").remove();
                    $("#responsedatalist").append("<thead id=\"responsedataheader\"><tr id=\"responsedataheaderrow\"></tr></thead>");
                    $("#responsedatalist").append("<tbody id=\"responsedatabody\"></tbody>");
                    setTimeout(function () {
                        $('#alertconfirmdelete').fadeOut();
                    }, config.other.alerttimeout);
                    getResponseData();
                }).catch(function (error) {
                    handleError(error);
                });
            }).catch(function (error) {
                handleError(error);
            });
        } else {
            //console.log("no user signed in.");
        }
    }
    $('#alertconfirmdelete').fadeIn();
    $("#cancelDelete").on('click touchstart', function () {
        if (!started) {
            $('#alertconfirmdelete').fadeOut();
            started = true;
        }
    });
    $("#confirmDelete").on('click touchstart', function () {
        if (!started) {
            deleteForm();
            started = true;
        }
    });
}
*/

$(document).ready(function () {

    $('#toslink').attr('href', config.other.tosUrl);
    $('#privacypolicylink').attr('href', config.other.privacyPolicyUrl);

    //$(document).on('click touchstart', ".responseDelete", deleteSubmission);

    var signed_in_initially = false;
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            //console.log("signed in");
            signed_in_initially = true;
            var user = firebase.auth().currentUser;
            window.userId = user.uid;
            window.email = user.email;
            var testemail = new RegExp(config.regex.companyemailregex, 'g');
            if (testemail.test(window.email)) {
                $("#goBack").removeClass("collapse");
                $("#headeralternate").addClass("collapse");
                $("#headermain").removeClass("collapse");
            } else {
                $("#goBack").addClass("collapse");
                $("#headermain").addClass("collapse");
                $("#headeralternate").removeClass("collapse");
            }
            $(".logoutButton").on('click touchstart', function () {
                firebase.auth().signOut().then(function () {
                    // Sign-out successful.
                }).catch(function (error) {
                    // An error happened.
                    handleError(error);
                });
            });
            getResponseData();
        } else {
            // No user is signed in. redirect to login page:
            if (signed_in_initially) {
                $('#alertsignoutsuccess').fadeIn();
                setTimeout(function () {
                    $('#alertsignoutsuccess').fadeOut();
                    //console.log("redirecting to login page");
                    setTimeout(function () {
                        window.location.href = 'login.html';
                    }, config.other.redirecttimeout);
                }, config.other.alerttimeout);
            } else {
                //slow redirect
                handleError({
                    code: "auth/notsignedin",
                    message: "Not Signed in. Redirecting."
                });
                //console.log("redirecting to login page");
                setTimeout(function () {
                    window.location.href = 'login.html';
                }, config.other.redirecttimeout);
                //fast redirect
                // window.location.href = 'login.html';
            }
        }
    });

    $(document).on('click touchstart', ".formView", function () {
        var valueArray = $(this).attr('value').split(',');
        var formKey = valueArray[0];
        var responseid = valueArray[1];
        setTimeout(function () {
            window.location.href = 'view.html?mode=response&formid=' + formKey + '&responseid=' + responseid;
        }, config.other.redirecttimeout);
    });

    $("#goBack").on('click touchstart', function () {
        window.location.href = "user.html";
    });
});