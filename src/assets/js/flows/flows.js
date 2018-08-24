var jQuery = require("jquery");
require('jquery-validation');
require("popper.js");
require("bootstrap");
window.$ = window.jQuery = jQuery;
require('datatables.net-bs4');
require('datatables.net-responsive-bs4');
require('datatables.net-select-bs4');
require('datatables.net-bs4/css/dataTables.bootstrap4.min.css');
require('datatables.net-responsive-bs4/css/responsive.bootstrap4.min.css');
require('datatables.net-select-bs4/css/select.bootstrap4.min.css');

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
    if (errorCode == "auth/notsignedin" || errorCode == "workflow/unauthorized") {
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

    function getWorkflowData() {
        var ranonce = false;
        firebase.database().ref('access/workflows/workflowsbyuser/' + window.userId).limitToLast(config.other.userviewmax).once('value').then(function (accessWorkflows) {
            accessWorkflows.forEach(function (accessWorkflow) {
                var workflowId = accessWorkflow.key;
                //console.log(workflowId);
                var accessWorkflowData = accessWorkflow.val();
                var access = accessWorkflowData.access;
                //console.log(access);
                firebase.database().ref('workflows/' + workflowId).once('value').catch(function (error) {
                    handleError(error);
                }).then(function (workflow) {
                    var workflowid = workflow.key;
                    //console.log(workflowid);
                    var workflowVal = workflow.val();
                    //console.log(workflowVal);
                    var workflowName = workflowVal.name;
                    //var formsUsedIn = workflowVal.forms;
                    //var numFormsWorkflowUsed = 0;
                    /*
                    try {
                        //console.log(formsUsedIn, formsUsedIn.length);
                        //numFormsWorkflowUsed = formsUsedIn.length;
                    } catch (err) {
                        //not used in any forms yet
                    }
                    */
                    var workflowData = workflowVal.workflow;
                    var workflowString = "start";
                    var arrowright = "<img src=\"assets/icons/arrow-right.svg\" class=\"arrow-right\">";
                    for (var i = 0; i < workflowData.length; i++) {
                        var emailDatapoint = workflowData[i].value;
                        //console.log(emailDatapoint);
                        workflowString = workflowString + arrowright + emailDatapoint;
                    }
                    workflowString = workflowString + arrowright + "end";
                    try {
                        var utctime = new Date(workflowVal.time);
                        var time = utctime.toString();
                    } catch (err) {
                        //console.log("undefined error: " + err);
                    }
                    //console.log("time: " + time);
                    var rowToAppend = "<tr><td>" + workflowName + "</td><td>" + time + "</td><td>" + workflowString + "</td>" +
                        "<td><button value=\"" + workflowid + "\" class=\"workflowShare btn btn-primary btn-block onclick=\"void(0)\"\">Share</button></td>" +
                        "<td><button value=\"" + workflowid + "\" class=\"workflowEdit btn btn-primary btn-block onclick=\"void(0)\"\">Edit</button></td>" +
                        "<td><button value=\"" + workflowid + "\" class=\"workflowDelete btn btn-primary btn-block onclick=\"void(0)\"\">Delete</button></td></tr>";
                    /*
                    if (numFormsWorkflowUsed == 0) {
                        var rowToAppend = "<tr><td>" + workflowName + "</td><td>" + time + "</td><td>" + workflowString + "</td>" +
                        "<td><button value=\"" + workflowid + "\" class=\"workflowShare btn btn-primary btn-block onclick=\"void(0)\"\">Share</button></td>" +
                        "<td><button value=\"" + workflowid + "\" class=\"workflowEdit btn btn-primary btn-block onclick=\"void(0)\"\">Edit</button></td>" +
                        "<td><button value=\"" + workflowid + "\" class=\"workflowDelete btn btn-primary btn-block onclick=\"void(0)\"\">Delete</button></td></tr>";
                    } else {
                        var rowToAppend = "<tr><td>" + workflowName + "</td><td>" + time + "</td><td>" + workflowString + "</td>" +
                        "<td><button value=\"" + workflowid + "\" class=\"workflowUnauthorized btn btn-primary btn-block onclick=\"void(0)\"\">Share</button></td>" +
                        "<td><button value=\"" + workflowid + "\" class=\"workflowUnauthorized btn btn-primary btn-block onclick=\"void(0)\"\">Edit</button></td>" +
                        "<td><button value=\"" + workflowid + "\" class=\"workflowUnauthorized btn btn-primary btn-block onclick=\"void(0)\"\">Delete</button></td></tr>";
                    }
                    */
                    $('#userworkflowdata').append(rowToAppend);
                    if (!(ranonce)) {
                        ranonce = true;
                        $("#noflowswarning").addClass("collapse");
                        $("#userworkflowlistcollapse").removeClass("collapse");
                        $("#selectactions").removeClass("collapse");
                    }
                });
            });
            setTimeout(function () {
                if (!(ranonce)) {
                    $("#noflowswarning").removeClass("collapse");
                    $("#userworkflowlistcollapse").addClass("collapse");
                    $("#selectactions").addClass("collapse");
                } else {
                    if (!(tableInitialized)) {
                        $('#userworkflowlist').DataTable({
                            responsive: true,
                            select: {
                                style: 'multi'
                            }
                        });
                        tableInitialized = true;
                    }
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
            getWorkflowData();
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

    $(document).on('click touchstart', ".workflowEdit", function () {
        var valueArray = $(this).attr('value').split(',');
        var workflowid = valueArray[0];
        setTimeout(function () {
            window.location.href = 'workflow.html?mode=edit&workflowid=' + workflowid;
        }, config.other.redirecttimeout);
    });

    function deleteWorkflow(workflowid) {
        //console.log("delete the workflow");
        firebase.database().ref('workflows/' + workflowid).once('value').catch(function (error) {
            handleError(error);
        }).then(function (workflow) {
            var workflowVal = workflow.val();
            //console.log(workflowVal);
            var formsUsedIn = workflowVal.forms;
            if (formsUsedIn !== undefined) {
                //console.log(formsUsedIn);
                var formsUsedInlen = formsUsedIn.length;
                var len1 = false;
                if (formsUsedInlen == undefined) {
                    //only one form is using it
                    formsUsedInlen = 1;
                    len1 = true;
                }
                for (var i = 0; i < formsUsedInlen; i++) {
                    var formUsedInId;
                    if (len1) {
                        formUsedInId = Object.keys(formsUsedIn)[0];
                    } else {
                        formUsedInId = Object.keys(formsUsedIn[i])[0];
                    }
                    //console.log("form id: " + formUsedInId);
                    firebase.database().ref('forms/' + formUsedInId).update({
                        workflow: ""
                    }).catch(function (error) {
                        handleError(error);
                    });
                    firebase.database().ref('workflows/' + workflowid + '/forms/' + formUsedInId).remove().catch(function (err) {
                        handleError(err);
                    });
                }
            }

            firebase.database().ref('workflows/' + workflowid).remove().then(function () {
                firebase.database().ref('access/workflows/workflowsbyuser/' + window.userId + "/" + workflowid).remove().then(function () {
                    firebase.database().ref('access/workflows/workflowsbyid/' + workflowid + "/" + window.userId).remove().then(function () {
                        setTimeout(function () {
                            $('#alertconfirmdelete').fadeOut();
                        }, config.other.alerttimeout);
                    }).catch(function (error) {
                        handleError(error);
                    });
                }).catch(function (error) {
                    handleError(error);
                });
            }).catch(function (error) {
                handleError(error);
            });
        }).catch(function (error) {
            handleError(error);
        });
    }

    $(document).on('click touchstart', ".workflowDelete", function () {
        var button = $(this);
        //console.log(button);
        var valueArray = button.attr('value').split(',');
        //console.log(valueArray);
        var workflowid = valueArray[0];
        var started = false;
        $('#alertconfirmdelete').fadeIn();
        $("#cancelDelete").on('click touchstart', function () {
            if (!started) {
                $('#alertconfirmdelete').fadeOut();
                started = true;
            }
        });
        $("#confirmDelete").on('click touchstart', function () {
            if (!started) {
                deleteWorkflow(workflowid);
                started = true;
                var table = $('#userworkflowlist').DataTable();
                var row;
                if ($(button).closest('table').hasClass("collapsed")) {
                    var child = $(button).parents("tr.child");
                    row = $(child).prevAll(".parent");
                } else {
                    row = $(button).parents('tr');
                }
                table.row(row).remove().draw();
            }
        });
    });

    $(document).on('click touchstart', "#deleteSelected", function () {
        var started = false;
        var table = $('#userworkflowlist').DataTable();
        if (table.rows('.selected').any()) {
            $('#alertconfirmdelete').fadeIn();
            $("#cancelDelete").on('click touchstart', function () {
                if (!started) {
                    $('#alertconfirmdelete').fadeOut();
                    started = true;
                }
            });
            $("#confirmDelete").on('click touchstart', function () {
                if (!started) {
                    $('#userworkflowdata').find('.selected').each(function () {
                        var valueArray = $(this).find('.workflowDelete').attr('value').split(',');
                        //console.log(valueArray);
                        var workflowid = valueArray[0];
                        deleteWorkflow(workflowid);
                    }).promise().done(function () {
                        table.rows('.selected').remove().draw(false);
                    })
                    started = true;
                }
            });
        } else {
            //console.log("nothing selected.");
        }
    });

    var allselected = false;

    $("#selectAll").on('click touchstart', function () {
        var table = $('#userworkflowlist').DataTable();
        if (allselected) {
            table.rows().deselect();
            allselected = false;
        } else {
            table.rows().select();
            allselected = true;
        }
    });

    function shareWorkflow(userId, workflowid, emailaddress) {
        //console.log("share the workflow");
        //console.log("user Id: " + userId);
        firebase.database().ref('access/workflows/workflowsbyuser/' + userId + '/' + workflowid).set({
            access: "edit",
            role: "friend"
        }).then(function () {
            firebase.database().ref('access/workflows/workflowsbyid/' + workflowid + '/' + userId).set({
                access: "edit",
                role: "friend",
                email: emailaddress
            }).then(function () {
                //console.log("workflow shared");
            }).catch(function (error) {
                handleError(error);
            });
        }).catch(function (error) {
            handleError(error);
        });
    }

    $.validator.addMethod(
        "regex",
        function (value, element, regexp) {
            var re = new RegExp(regexp, 'i');
            return this.optional(element) || re.test(value);
        },
        ""
    );

    $("#addShare").validate({
        errorElement: "div",
        errorPlacement: function (error, element) {
            // Add the `invalid-feedback` class to the div element
            error.addClass("invalid-feedback");
            error.insertAfter(element);
        },
        highlight: function (element) {
            $(element).addClass("is-invalid").removeClass("is-valid");
        },
        unhighlight: function (element) {
            $(element).addClass("is-valid").removeClass("is-invalid");
        }
    });

    var newEmails = [];
    var newUserIds = [];
    var emails = [];
    var userIds = [];
    var workflowIdArray = [];

    function addRemoveButton(id) {
        $('#' + id).on('click touchstart', function () {
            var delButton = $(this);
            //console.log(delButton);
            var valArr = delButton.attr('value').split(',');
            //console.log(valArr);
            var userid = valArr[0];
            var workflowId = valArr[1];
            var emailaddr = valArr[2];
            //console.log(userid, workflowId);
            var workflowIds = [workflowId];
            if (workflowIdArray !== undefined && workflowIdArray.length !== 0) {
                //console.log("remove selected shares");
                workflowIds = workflowIdArray;
                //console.log(workflowIds);
            }
            //must be 2 different loops to avoid asyncronous problems
            for (var i = 0; i < workflowIds.length; i++) {
                var workid = workflowIds[i]
                //console.log(userid, workid);
                firebase.database().ref('access/workflows/workflowsbyuser/' + userid + "/" + workid).remove().then(function () {
                    //console.log(workid, userid);
                }).catch(function (error) {
                    handleError(error);
                });
                firebase.database().ref('access/workflows/workflowsbyid/' + workid + "/" + userid).remove().then(function () {
                    //console.log("user deleted");
                    //console.log(userid, workid);
                    $('#' + id).off();
                }).catch(function (error) {
                    handleError(error);
                });
            }
            setTimeout(function () {
                removeShareFromArrays(emailaddr, userid);
                updateShareList(workflowIds, emails, userIds);
            }, config.other.datatimeout);
        });
    }

    function updateShareList(workflowids) {
        var sharedWithString = "<p id=\"sharedWithData\">";
        for (var i = 0; i < userIds.length; i++) {
            //console.log(emails[i], userIds[i]);
            if (emails[i] !== window.email) {
                sharedWithString = sharedWithString + emails[i] + "<button value=\"" + userIds[i] + ',' + workflowids[0] + ',' + emails[i] +
                    "\" class=\"btn btn-primary btn-block onclick=\"void(0)\"\" id=\"" + userIds[i] + "\">Remove</span></button>";
            } else {
                sharedWithString = sharedWithString + emails[i] + ",";
            }
        }
        sharedWithString = sharedWithString + "</p>"
        var emailsString = emails.toString();
        var idstring = userIds.toString();
        //console.log(emailsString, idstring);
        $("#shareEmail").val('');
        $("#sharedWithData").remove();
        $("#sharedWith").append(sharedWithString);
        for (var i = 0; i < userIds.length; i++) {
            addRemoveButton(userIds[i]);
        }
    }

    function removeShareFromArrays(emailaddr, userid) {
        var userIdIndex = userIds.indexOf(userid);
        if (userIdIndex > -1) {
            userIds.splice(userIdIndex, 1);
        }
        var emailsIndex = emails.indexOf(emailaddr);
        if (emailsIndex > -1) {
            emails.splice(emailsIndex, 1);
        }
        var newUserIdsIndex = newUserIds.indexOf(userid);
        if (newUserIdsIndex > -1) {
            newUserIds.splice(newUserIdsIndex, 1);
        }
        var newEmailsIndex = newEmails.indexOf(emailaddr);
        if (newEmailsIndex > -1) {
            newEmails.splice(newEmailsIndex, 1);
        }
    }

    function getInitialShares(workflowids) {
        //console.log("get initial shares: " + workflowids);
        var i = 0;
        for (var k = 0; k < workflowids.length; k++) {
            var currentId = workflowids[k];
            firebase.database().ref('access/workflows/workflowsbyid/' + currentId).once('value').catch(function (error) {
                updatedShare = false;
            }).then(function (usersData) {
                //console.log(usersData);
                var numResults = usersData.numChildren();
                var count = 0;
                usersData.forEach(function (userInfo) {
                    count++;
                    //console.log(count, numResults, i);
                    //console.log(userInfo);
                    var userInfoVal = userInfo.val();
                    //console.log(userInfoVal);
                    var userIdKey = userInfo.key;
                    //console.log(userIdKey);
                    userIds.push(userIdKey);
                    var emailaddress = userInfoVal.email;
                    //console.log(emailaddress);
                    emails.push(emailaddress);
                    if (count >= numResults) {
                        i++;
                        //console.log(count, numResults, i);
                    }
                    //console.log(emails, userIds);
                    //console.log("current status: ");
                    //console.log(i, workflowids.length, count, numResults);
                    if (i == workflowids.length && count == numResults) {
                        //console.log(emails, userIds);
                        //console.log("got emails initially. filtering for duplicates now.");

                        function getFrequency(arr) {
                            var a = [],
                                b = [],
                                prev;
                            arr.sort();
                            for (var j = 0; j < arr.length; j++) {
                                if (arr[j] !== prev) {
                                    a.push(arr[j]);
                                    b.push(1);
                                } else {
                                    b[b.length - 1]++;
                                }
                                prev = arr[j];
                            }
                            return [a, b];
                        }
                        var testemails = emails.slice(0);
                        var emailfreq = getFrequency(testemails);
                        //console.log(emailfreq[0], emailfreq[1]);
                        var emailresult = [];
                        var userIdresult = [];
                        for (var j = 0; j < emails.length; j++) {
                            var emailresultIndex = emailresult.indexOf(emails[j]);
                            //console.log("email result index: " + emailresultIndex);
                            if (emailresultIndex < 0) {
                                var emailfreqIndex = emailfreq[0].indexOf(emails[j]);
                                //console.log("email freq index: " + emailfreqIndex);
                                //console.log("frequency: " + emailfreq[1][emailfreqIndex]);
                                //console.log(emails, userIds);
                                if (emailfreq[1][emailfreqIndex] == i || i == 1) {
                                    emailresult.push(emails[j]);
                                    userIdresult.push(userIds[j]);
                                }
                            }
                        }
                        emails = emailresult;
                        userIds = userIdresult;
                        //console.log("emails and user ids: " + emails + userIds);
                        updateShareList(workflowids);
                        return;
                    }
                });
            });
        }
    }

    function checkValidEmails(workflowids, value) {
        emailsData = (value).split(',').map(function (item) {
            return item.trim();
        });
        //console.log(emailsData);
        var updatedShare = false;
        var updatecount = 0;
        var userIdsToAdd = [];
        var emailsToAdd = [];
        var emailslen = emailsData.length;
        for (var i = 0; i < emailslen; i++) {
            var emailToAdd = emailsData[i];
            //console.log("email to add: " + emailToAdd);
            if (!(emails.includes(emailToAdd))) {
                firebase.database().ref().child('users').orderByChild('email').equalTo(emailToAdd).once('value').catch(function (error) {
                    updatedShare = false;
                }).then(function (userData) {
                    var userId;
                    try {
                        userId = Object.keys(userData.val())[0];
                    } catch (err) {
                        //console.log("user not found.")
                    }
                    if (userId !== null && userId !== undefined) {
                        updatecount++;
                        //console.log("userid: " + userId);
                        userIdsToAdd.push(userId);
                        //console.log("ids to add: " + userIdsToAdd);
                        //console.log("emails to add: " + emailsToAdd);
                        emailsToAdd.push(emailToAdd);
                        updatedShare = true;
                    }
                });
            } else {
                updatedShare = true;
            }
        }
        setTimeout(function () {
            if (updatedShare && updatecount == emailslen) {
                newEmails = newEmails.concat(emailsToAdd);
                newUserIds = newUserIds.concat(userIdsToAdd);
                emails = emails.concat(emailsToAdd);
                userIds = userIds.concat(userIdsToAdd);
                //console.log(emails, newUserIds);
                updateShareList(workflowids, emails, userIds);
            } else {
                if (!(updatedShare)) {
                    handleError({
                        code: "share/invalid-email",
                        message: "Users not registered cannot be shared with."
                    });
                }
                $("#shareEmail").val('');
            }
        }, config.other.datatimeout);
    }

    function closemodal(started) {
        if (!started) {
            started = true;
            $("#shareEmail").val('');
            $("#sharedWithData").remove();
            $('#shareModal').modal('hide');
            $("#saveShare").off();
            $('#shareEmail').unbind("keypress");
            $("#cancelShare").off();
            $(".workflowShare").off();
            $(".removeShare").off();
            newEmails = [];
            newUserIds = [];
            emails = [];
            userIds = [];
            workflowIdArray = [];
        }
    }

    $(document).on('click touchstart', ".workflowShare", function () {
        var button = $(this);
        //console.log(button);
        var valueArray = button.attr('value').split(',');
        //console.log(valueArray);
        var workflowid = valueArray[0];
        var started = false;

        getInitialShares([workflowid]);
        /*
        setTimeout(function () {
            updateShareList([workflowid]);
        }, config.other.datatimeout);
        */

        $('#shareModal').modal('show');
        $("#shareEmail").rules("add", {
            regex: config.regex.commaseperatedemails,
            messages: {
                regex: "Please enter valid emails."
            }
        });
        $("#shareModal").on('hidden.bs.modal', function () {
            closemodal(started);
        });
        $("#cancelShare").on('click touchstart', function () {
            closemodal(started);
        });
        $("#shareEmail").keypress(function (event) {
            //query to check if user exists here, and if not, warn the user with the jquery validation thing.
            if (event.which == '13') {
                if ($("#addShare").valid()) {
                    event.preventDefault();
                    var data = $(this).val();
                    //console.log(data);
                    checkValidEmails([workflowid], data);
                }
            }
        });
        $("#saveShare").on('click touchstart', function () {
            if (!started) {
                //console.log(newUserIds);
                for (var i = 0; i < newUserIds.length; i++) {
                    shareWorkflow(newUserIds[i], workflowid, newEmails[i]);
                }
                setTimeout(function () {
                    closemodal(started);
                    newEmails = [];
                    newUserIds = [];
                    emails = [];
                    userIds = [];
                    workflowIdArray = [];
                    started = true;
                }, config.other.datatimeout);
            }
        });
    });

    $(document).on('click touchstart', "#shareSelected", function () {
        var table = $('#userworkflowlist').DataTable();
        if (table.rows('.selected').any()) {
            var started = false;
            $('#userworkflowdata').find('.selected').each(function () {
                var valueArray = $(this).find('.workflowDelete').attr('value').split(',');
                //console.log(valueArray);
                var workflowid = valueArray[0];
                workflowIdArray.push(workflowid);
            });
            getInitialShares(workflowIdArray);
            setTimeout(function () {
                updateShareList(workflowIdArray);
            }, config.other.datatimeout);
            $('#shareModal').modal('show');
            $("#shareEmail").rules("add", {
                regex: config.regex.commaseperatedemails,
                messages: {
                    regex: "Please enter valid emails."
                }
            });
            $("#shareModal").on('hidden.bs.modal', function () {
                closemodal(started);
            });
            $("#cancelShare").on('click touchstart', function () {
                closemodal(started);
            });
            $("#shareEmail").keypress(function (event) {
                //query to check if user exists here, and if not, warn the user with the jquery validation thing.
                if (event.which == '13') {
                    if ($("#addShare").valid()) {
                        event.preventDefault();
                        var data = $(this).val();
                        //console.log(data);
                        checkValidEmails(workflowIdArray, data);
                    }
                }
            });
            $("#saveShare").on('click touchstart', function () {
                if (!started) {
                    //console.log(newUserIds);
                    for (var i = 0; i < newUserIds.length; i++) {
                        $('#userworkflowdata').find('.selected').each(function () {
                            var valueArray = $(this).find('.workflowDelete').attr('value').split(',');
                            //console.log(valueArray);
                            var workflowid = valueArray[0];
                            shareWorkflow(newUserIds[i], workflowid, newEmails[i]);
                        });
                    }
                    setTimeout(function () {
                        closemodal(started);
                        newEmails = [];
                        newUserIds = [];
                        emails = [];
                        userIds = [];
                        workflowIdArray = [];
                        started = true;
                    }, config.other.datatimeout);
                }
            });
        } else {
            //console.log("nothing selected.");
        }
    });


    /*
    $(document).on('click touchstart', ".workflowUnauthorized", function () {
        handleError({
            code: "workflow/unauthorized",
            message: "Cannot alter workflow. It is used in a form you own."
        });
    });
    */

    $("#createWorkflow").on('click touchstart', function () {
        window.location.href = "workflow.html";
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