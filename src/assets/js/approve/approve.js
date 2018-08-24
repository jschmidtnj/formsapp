var jQuery = require("jquery");
require("popper.js");
require("bootstrap");
window.$ = window.jQuery = jQuery;
require('datatables.net-bs4');
require('datatables.net-responsive-bs4');
require('datatables.net-bs4/css/dataTables.bootstrap4.min.css');
require('datatables.net-responsive-bs4/css/responsive.bootstrap4.min.css');

var JSZip = require('jszip');
var JSZipUtils = require('jszip-utils');
var FileSaver = require('file-saver');

var config = require('../../../config/config.json');
var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");
require("firebase/storage");
require("firebase/functions");

firebase.initializeApp(config.firebase);

function handleError(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    //console.log(errorCode, errorMessage);
    var customMessage = "";
    if (errorCode == "auth/notsignedin" || errorCode == "auth/unauthorized") {
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

var tableInitialized = false;

$(document).ready(function () {

    $('#toslink').attr('href', config.other.tosUrl);
    $('#privacypolicylink').attr('href', config.other.privacyPolicyUrl);

    $.fn.dataTable.ext.type.order['accept-regect-pre'] = function (d) {
        if (d.substring(0, 7) == "<button") {
            return 0;
        } else {
            return 1;
        }
    };

    function getResponseData() {
        var started = false;
        var ranonce = false;
        var cleanEmail = window.email.replace(/\./g, ',');

        function createTableApprovals() {
            if (!(ranonce)) {
                $("#noresponseswarning").removeClass("collapse");
                $("#userresponselistcollapse").addClass("collapse");
            } else {
                tableInitialized = true;
                if (tableInitialized) {
                    var table = $('#userresponselist').DataTable();
                    table.destroy();
                }
                $('#userresponselist').DataTable({
                    responsive: true,
                    columnDefs: [{
                        type: "accept-regect",
                        targets: 0
                    }]
                });
            }
        }
        firebase.database().ref('access/approval/' + cleanEmail).limitToLast(config.other.approvalviewmax).once('value').then(function (accessApprovals) {
            var numaccessapprovals = accessApprovals.numChildren();
            var approvalcount = 0;
            accessApprovals.forEach(function (accessApproval) {
                var responseId = accessApproval.key;
                //console.log(responseId);
                var accessApprovalData = accessApproval.val();
                var formId = accessApprovalData.formId;
                //console.log(formId);
                firebase.database().ref('responses/' + formId + '/' + responseId).once('value').catch(function (error) {
                    handleError(error);
                }).then(function (response) {
                    var responseKey = response.key;
                    //console.log(responseKey);
                    var responseData = response.val();
                    //console.log(responseData);
                    var userId = responseData.userId;
                    //console.log("userId: " + userId);
                    var status = responseData.status;
                    //console.log(status);
                    var createDownloadButton = false;
                    try {
                        var responsefileids = responseData.files.fileids;
                        //console.log(responsefileids);
                        if (responsefileids !== undefined && responsefileids !== null) {
                            var lenfiles = responsefileids.length;
                            if (!(lenfiles == 1 && responsefileids[0] == "nofiles")) {
                                createDownloadButton = true;
                            }
                        }
                    } catch (err) {
                        createDownloadButton = false;
                    }
                    var currentWorkflowUsers = responseData.currentWorkflow.split(',').map(function (item) {
                        return item.trim();
                    });
                    var comment = responseData.comment;
                    var rejectedBy = responseData.rejectedBy;
                    var commentstring = "";
                    var rejectedByString = "";
                    try {
                        var utctime = new Date(responseData.time);
                        var time = utctime.toString();
                    } catch (err) {
                        //console.log("undefined error: " + err);
                    }
                    //console.log("time: " + time);

                    var workflowString = "start";
                    var workflowData = responseData.workflowChain;
                    var arrowright = "<img src=\"assets/icons/arrow-right.svg\" class=\"arrow-right\">";
                    try {
                        for (var i = 0; i < workflowData.length; i++) {
                            var emailDatapoint = workflowData[i].value;
                            //console.log(emailDatapoint);
                            workflowString = workflowString + arrowright + emailDatapoint;
                        }
                    } catch (err) {
                        //only one workflow
                        status = "rejected";
                        comment = "Error no workflow";
                        window.comment = "Error no workflow";
                        rejectedBy = "admin";
                        firebase.database().ref('responses/' + formId + '/' + responseId).update({
                            status: status,
                            comment: window.comment,
                            rejectedBy: "admin"
                        }).then(function () {
                            firebase.database().ref('users/' + window.userId + '/responses/' + formId + '/' + responseId).update({
                                status: status,
                                comment: window.comment,
                                rejectedBy: "admin"
                            }).catch(function (err) {
                                handleError(err);
                            }).then(function () {
                                //console.log("sending rejected email notification");
                                var sendEmails = firebase.functions().httpsCallable('sendApprovedRejectedEmailNotification');
                                sendEmails({
                                    responseId: responseId,
                                    formId: formId
                                }).then(function (result) {
                                    // Read result of the Cloud Function.
                                    //console.log(result);
                                    var statusMessage = result.data.status;
                                    //console.log(statusMessage);
                                    //console.log("form rejected by admin");
                                }).catch(function (error) {
                                    // Getting the Error details.
                                    //console.log(error);
                                    handleError(error);
                                });
                            });
                        }).catch(function (err) {
                            handleError(err);
                        });
                    }
                    workflowString = workflowString + arrowright + "end"

                    if (comment !== undefined && comment !== "" && comment !== null) {
                        commentstring = ", comment: " + comment;
                        //console.log(commentstring);
                    }
                    if (rejectedBy !== undefined && rejectedBy !== "" && rejectedBy !== null) {
                        rejectedByString = ", rejected by: " + rejectedBy;
                    }

                    firebase.database().ref('users/' + userId).once('value').catch(function (error) {
                        handleError(error);
                    }).then(function (responseUser) {
                        var responseUserVal = responseUser.val();
                        var responseUserEmail = responseUserVal.email;
                        var responseUserName = responseUserVal.name;
                        var approvestring = "";

                        if (status == "pending") {
                            var indexOfUser = currentWorkflowUsers.indexOf(window.email);
                            if (indexOfUser !== -1) {
                                approvestring = "<button value=\"" + formId + ',' + responseKey + "\" class=\"approveResponse " +
                                    "btn btn-primary btn-block onclick=\"void(0)\"\">Approve</button><button value=\"" + formId + ',' + responseKey +
                                    "\" class=\"rejectResponse btn btn-primary btn-block onclick=\"void(0)\"\">Reject</button>";
                            } else {
                                approvestring = "<p>Pending on " + currentWorkflowUsers.toString() + "</p>";
                            }
                        } else if (status == "approved") {
                            approvestring = "<p>Approved</p>";
                        } else if (status == "rejected") {
                            approvestring = "<p>Rejected" + commentstring + rejectedByString + "</p>";
                        }

                        var downloadbuttonstring = "<td>No Attached Files</td>";
                        if (createDownloadButton) {
                            downloadbuttonstring = "<td><button value=\"" + formId + "," + responseKey + "\" class=\"downloadFiles " +
                                "btn btn-primary btn-block onclick=\"void(0)\"\">Download</button></td>"
                        }

                        $('#userapprovaldata').append("<tr><td>" + approvestring + "</td><td>" +
                            time + "</td><td>" + responseUserEmail + "</td><td>" + workflowString + "</td>" +
                            "<td><button value=\"" + formId + "," + responseKey + "\" class=\"responseView " +
                            "btn btn-primary btn-block onclick=\"void(0)\"\">View</button></td>" + downloadbuttonstring +
                            "</tr>");
                        if (!(ranonce)) {
                            ranonce = true;
                            $("#noresponseswarning").addClass("collapse");
                            $("#userresponselistcollapse").removeClass("collapse");
                        }
                        approvalcount++;
                        if (approvalcount == numaccessapprovals) {
                            createTableApprovals();
                        }
                    });
                });
            });
            setTimeout(function () {
                if (!(tableInitialized)) {
                    createTableApprovals();
                }
            }, config.other.datatimeout);
        }).catch(function (error) {
            handleError(error);
        });
    }

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
            if (!(testemail.test(window.email))) {
                window.location.href = "responses.html";
            }
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

    $(document).on('click touchstart', ".responseView", function () {
        var valueArray = $(this).attr('value').split(',');
        var formKey = valueArray[0];
        var responseKey = valueArray[1];
        setTimeout(function () {
            window.location.href = 'view.html?mode=response&formid=' + formKey + '&responseid=' + responseKey;
        }, config.other.redirecttimeout);
    });

    $(document).on('click touchstart', ".approveResponse", function () {
        var valueArray = $(this).attr('value').split(',');
        var formKey = valueArray[0];
        var responseKey = valueArray[1];
        var started = false;

        function approveResponse() {
            //console.log("approve the submission");
            var newStatus;
            var nextWorkflow;
            firebase.database().ref('responses/' + formKey + '/' + responseKey).once('value').catch(function (error) {
                handleError(error);
            }).then(function (responseInfo) {
                var responseInfoVal = responseInfo.val();
                //console.log(responseInfoVal);
                var currentWorkflow = responseInfoVal.currentWorkflow;
                //console.log(currentWorkflow);
                var currentWorkflowArr = currentWorkflow.split(',').map(function (item) {
                    return item.trim();
                });
                //console.log(currentWorkflowArr);
                var authorized = false;
                for (var i = 0; i < currentWorkflowArr.length; i++) {
                    //console.log(window.email, currentWorkflowArr[i]);
                    if (window.email == currentWorkflowArr[i]) {
                        authorized = true;
                    }
                }
                if (!(authorized)) {
                    //console.log("unauthorized to approve workflow");
                    handleError({
                        code: "auth/unauthorized",
                        message: "Unauthorized to approve workflow."
                    });
                    return;
                }
                var responseWorkflowChain = responseInfoVal.workflowChain;
                //console.log(responseWorkflowChain);
                var passedCurrentWorkflow = false;
                nextWorkflow = "";
                try {
                    for (var i = 0; i < responseWorkflowChain.length; i++) {
                        var responseWorkflowChainVal = responseWorkflowChain[i].value;
                        //console.log(responseWorkflowChainVal, currentWorkflow);
                        if (responseWorkflowChainVal == currentWorkflow) {
                            passedCurrentWorkflow = true;
                            continue;
                        }
                        if (passedCurrentWorkflow) {
                            nextWorkflow = responseWorkflowChainVal;
                            break;
                        }
                    }
                } catch (err) {
                    //only one workflow
                    //console.log("only one workflow");
                }
                if (!(passedCurrentWorkflow)) {
                    handleError({
                        code: "approving/cannot-find-current-approver",
                        message: "Cannot find current approver in approver list."
                    });
                }
                //console.log(nextWorkflow);
                var notificationstatusstring = "pending";
                newStatus = "pending";
                if (nextWorkflow == "") {
                    newStatus = "approved";
                    notificationstatusstring = "sent";
                }
                //console.log(newStatus);
                firebase.database().ref('responses/' + formKey + '/' + responseKey).update({
                    status: newStatus,
                    comment: window.comment,
                    currentWorkflow: nextWorkflow
                }).then(function () {
                    firebase.database().ref('users/' + window.userId + '/responses/' + formKey + '/' + responseKey).update({
                        status: newStatus,
                        comment: window.comment,
                        currentWorkflow: nextWorkflow
                    }).then(function () {
                        var nextapprovalarray = nextWorkflow.split(',').map(function (item) {
                            return item.trim();
                        });
                        //console.log(nextapprovalarray);
                        var nextapprovallen = nextapprovalarray.length;
                        for (var i = 0; i < nextapprovallen; i++) {
                            var cleanemail = nextapprovalarray[i].replace(/\./g, ',');
                            //console.log(cleanemail);
                            if (cleanemail !== "" && cleanemail !== null && cleanemail !== undefined) {
                                //console.log(cleanemail);
                                firebase.database().ref('access/approval/' + cleanemail + '/' + responseKey).set({
                                    formId: formKey
                                }).then(function () {
                                    //console.log("added approval status to next approval");
                                }).catch(function (err) {
                                    handleError(err);
                                })
                            }
                            if (i == nextapprovallen - 1 && newStatus == "pending") {
                                //console.log("sending approval email notification");
                                var sendEmails = firebase.functions().httpsCallable('sendApprovedRejectedEmailNotification');
                                sendEmails({
                                    responseId: responseKey,
                                    formId: formKey
                                }).then(function (result) {
                                    // Read result of the Cloud Function.
                                    //console.log(result);
                                    var statusMessage = result.data.status;
                                    //console.log(statusMessage);
                                    //console.log("form approved sent to next party");
                                }).catch(function (error) {
                                    // Getting the Error details.
                                    //console.log(error);
                                    handleError(error);
                                });
                            }
                        }
                        setTimeout(function () {
                            if (newStatus == "approved") {
                                //console.log("approved the submission");
                                //console.log("sending approved email notification");
                                var sendEmails = firebase.functions().httpsCallable('sendApprovedRejectedEmailNotification');
                                sendEmails({
                                    responseId: responseKey,
                                    formId: formKey
                                }).then(function (result) {
                                    // Read result of the Cloud Function.
                                    //console.log(result);
                                    var statusMessage = result.data.status;
                                    //console.log(statusMessage);
                                    //console.log("form approved notification sent");
                                }).catch(function (error) {
                                    // Getting the Error details.
                                    //console.log(error);
                                    handleError(error);
                                });
                            } else {
                                //console.log("submission still pending");
                            }
                            $("#userapprovaldata").remove();
                            $("#userresponselist").append("<tbody id=\"userapprovaldata\"></tbody>");
                            setTimeout(function () {
                                $('#alertconfirmapprove').fadeOut();
                            }, config.other.alerttimeout);
                            getResponseData();
                        }, config.other.datatimeout);
                    }).catch(function (error) {
                        handleError(error);
                    });
                }).catch(function (error) {
                    handleError(error);
                });
            });
        }
        $('#alertconfirmapprove').fadeIn();
        $("#cancelApprove").on('click touchstart', function () {
            if (!started) {
                setTimeout(function () {
                    $('#alertconfirmapprove').fadeOut();
                }, config.other.alerttimeout);
                started = true;
            }
        });
        $("#confirmApprove").on('click touchstart', function () {
            window.comment = $("#addComment").val();
            if (!started) {
                approveResponse();
                started = true;
            }
        });
    });

    $(document).on('click touchstart', ".rejectResponse", function () {
        var valueArray = $(this).attr('value').split(',');
        var formKey = valueArray[0];
        var responseKey = valueArray[1];
        var started = false;

        function rejectResponse() {
            //console.log("reject the submission");
            firebase.database().ref('responses/' + formKey + '/' + responseKey).update({
                status: "rejected",
                rejectedBy: window.email,
                comment: window.comment
            }).catch(function (error) {
                handleError(error);
            }).then(function () {
                firebase.database().ref('users/' + window.userId + '/responses/' + formKey + '/' + responseKey).update({
                    status: "rejected",
                    rejectedBy: window.email,
                    comment: window.comment
                }).catch(function (error) {
                    handleError(error);
                }).then(function () {
                    //console.log("rejected the submission");
                    //console.log("sending rejection email notification");
                    var sendEmails = firebase.functions().httpsCallable('sendApprovedRejectedEmailNotification');
                    sendEmails({
                        responseId: responseKey,
                        formId: formKey
                    }).then(function (result) {
                        // Read result of the Cloud Function.
                        //console.log(result);
                        var statusMessage = result.data.status;
                        //console.log(statusMessage);
                        //console.log("form rejected email sent");
                    }).catch(function (error) {
                        // Getting the Error details.
                        //console.log(error);
                        handleError(error);
                    });
                    $("#userapprovaldata").remove();
                    $("#userresponselist").append("<tbody id=\"userapprovaldata\"></tbody>");
                    setTimeout(function () {
                        $('#alertconfirmreject').fadeOut();
                    }, config.other.alerttimeout);
                    getResponseData();
                });
            });
        }
        $('#alertconfirmreject').fadeIn();
        $("#cancelReject").on('click touchstart', function () {
            if (!started) {
                setTimeout(function () {
                    $('#alertconfirmreject').fadeOut();
                }, config.other.alerttimeout);
                started = true;
            }
        });
        $("#confirmReject").on('click touchstart', function () {
            window.comment = $("#addComment").val();
            if (!started) {
                rejectResponse();
                started = true;
            }
        });
    });

    $(document).on('click touchstart', ".downloadFiles", function () {
        var valueArray = $(this).attr('value').split(',');
        var formId = valueArray[0];
        var responseId = valueArray[1];
        var urlArray = [];
        var counturl = 0;
        firebase.database().ref('responses/' + formId + '/' + responseId).once('value').catch(function (error) {
            handleError(error);
        }).then(function (response) {
            responseVal = response.val();
            var fileids = responseVal.files.fileids;
            var filenames = responseVal.files.filenames;
            //console.log(fileids, filenames);
            for (var j = 0; j < fileids.length; j++) {
                firebase.storage().ref('files/' + fileids[j]).getDownloadURL().then(function (url) {
                    counturl++;
                    //console.log("url: " + url);
                    urlArray.push(url);
                    if (counturl == fileids.length) {
                        var urlArrayLen = urlArray.length;
                        var count = 0;
                        if (urlArrayLen > 1) {
                            var zip = new JSZip();
                            var rightnow = new Date();
                            var datevalues = [
                                rightnow.getFullYear(),
                                rightnow.getMonth() + 1,
                                rightnow.getDate(),
                                rightnow.getHours(),
                                rightnow.getMinutes(),
                                rightnow.getSeconds()
                            ];
                            var zipFilename = config.other.zipfilename + '-' + datevalues[0] + '-' + ("0" + datevalues[1]).slice(-2) + '-' + ("0" + datevalues[2]).slice(-2) + '-' + ("0" + datevalues[3]).slice(-2) + '-' + ("0" + datevalues[4]).slice(-2) + '.zip';
                            for (var i = 0; i < urlArrayLen; i++) {
                                JSZipUtils.getBinaryContent(urlArray[i], function (err, data) {
                                    if (err) {
                                        throw err; // or handle the error
                                    } else {
                                        var filename = filenames[count];
                                        //console.log(filename, filenames);
                                        zip.file(filename, data, {
                                            binary: true
                                        });
                                        count++;
                                        //console.log(count, urlArray.length);
                                        if (count == urlArray.length) {
                                            zip.generateAsync({
                                                type: 'blob'
                                            }).then(function (content) {
                                                FileSaver.saveAs(content, zipFilename);
                                                //console.log("saved data");
                                            });
                                        }
                                    }
                                });
                            }
                        } else {
                            var xhr = new XMLHttpRequest();
                            var filename = filenames[0];
                            xhr.open("GET", urlArray[0]);
                            xhr.responseType = 'blob';
                            xhr.onload = function () {
                                FileSaver.saveAs(xhr.response, filename);
                            }
                            xhr.send();
                        }
                    }
                });
            }
        }).catch(function (err) {
            handleError(err);
        });
    });

    $("#logoutButton").on('click touchstart', function () {
        firebase.auth().signOut().then(function () {
            // Sign-out successful.
        }).catch(function (error) {
            // An error happened.
            handleError(error);
        });
    });
});