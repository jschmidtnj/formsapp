var jQuery = require("jquery");
require('jquery-validation');
require("popper.js");
require("bootstrap");
window.$ = window.jQuery = jQuery;

var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");
var config = require('../../../config/config.json');
firebase.initializeApp(config.firebase);

function handleError(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    //console.log(errorCode, errorMessage);
    var customMessage = "";
    if (errorCode == "auth/notsignedin" || errorCode == "auth/invalid-workflow-id" || errorCode == "auth/no-edit-access") {
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

var workflowId = "";
var workflowData;
var inactiveTime;
var justsaved = false;
var autosavemode = true;
var justcreated = true;
var savedBefore = false;
var entrycount = -1;

function createWorkflowGenerator() {

    function saveWorkflow() {
        var workflowInfoData = $("#workflowInfo").serializeArray();
        //console.log(workflowInfoData);
        window.workflowName = workflowInfoData[0].value;
        workflowData = $("#workflow-builder").serializeArray();
        for (var i = 0; i < workflowData.length; i++) {
            if (workflowData[i].value == "") {
                workflowData.splice(i, 1);
                i--;
            }
        }
        if (!($("#workflow-builder").valid())) {
            workflowData = [];
        }
        //console.log(workflowData);
        if (workflowData !== undefined) {
            //console.log(workflowData.length);
        }
        var dateTime = Date.now();
        //var user = firebase.auth().currentUser;
        //console.log(workflowId);
        if (workflowId !== "") {
            //console.log(JSON.stringify(workflowData), workflowId);
            if (workflowData == undefined || workflowData == [] || workflowData.length == 0) {
                firebase.database().ref('workflows/' + workflowId).remove();
                firebase.database().ref('access/workflows/workflowsbyuser/' + window.userId + '/' + workflowId).remove();
                firebase.database().ref('access/workflows/workflowsbyid/' + workflowId + '/' + window.userId).remove();
                //console.log("removed data");
                workflowId = "";
                justcreated = true;
            } else {
                firebase.database().ref('workflows/' + workflowId).set({
                    workflow: workflowData,
                    time: dateTime,
                    sharing: "private",
                    name: window.workflowName
                }).then(function () {
                    if (justcreated) {
                        firebase.database().ref('access/workflows/workflowsbyuser/' + window.userId + '/' + workflowId).set({
                            access: "edit",
                            role: "owner"
                        }).then(function () {
                            firebase.database().ref('access/workflows/workflowsbyid/' + workflowId + '/' + window.userId).set({
                                access: "edit",
                                role: "owner",
                                email: window.email
                            }).then(function () {
                                //console.log("workflow data updated");
                                if (!autosavemode) {
                                    $('#alertsavesuccess').fadeIn();
                                    setTimeout(function () {
                                        $('#alertsavesuccess').fadeOut();
                                    }, config.other.alerttimeout);
                                    autosavemode = true;
                                }
                            }).catch(function (error) {
                                handleError(error);
                            });
                        }).catch(function (error) {
                            handleError(error);
                        });
                        justcreated = false;
                    } else {
                        //console.log("workflow data updated");
                    }
                }).catch(function (error) {
                    handleError(error);
                });
            }
        } else {
            if (workflowData !== undefined && workflowData !== [] && workflowData.length !== 0) {
                savedBefore = true;
                if (workflowId == "") {
                    //console.log(workflowId);
                    workflowId = firebase.database().ref().child('workflow').push().key;
                }
                firebase.database().ref('workflows/' + workflowId).set({
                    workflow: workflowData,
                    time: dateTime,
                    sharing: "private",
                    name: window.workflowName
                }).then(function () {
                    //console.log(workflowId);
                    //console.log("workflow data saved");
                    firebase.database().ref('access/workflows/workflowsbyuser/' + window.userId + '/' + workflowId).set({
                        access: "edit",
                        role: "owner"
                    }).then(function () {
                        firebase.database().ref('access/workflows/workflowsbyid/' + workflowId + '/' + window.userId).set({
                            access: "edit",
                            role: "owner",
                            email: window.email
                        }).then(function () {
                            if (!autosavemode) {
                                $('#alertsavesuccess').fadeIn();
                                setTimeout(function () {
                                    $('#alertsavesuccess').fadeOut();
                                }, config.other.alerttimeout);
                                autosavemode = true;
                            }
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
        }
    }

    function resetTimer() {
        if (!justsaved) {
            clearTimeout(inactiveTime);
            inactiveTime = setTimeout(function () {
                if (workflowId !== "") {
                    $("#saving-status").text("saving...")
                    saveWorkflow();
                    //console.log("workflow saved automatically");
                    $("#saving-status").text("saved")
                } else {
                    $("#saving-status").text("saved")
                    saveWorkflow();
                }
                justsaved = true;
            }, config.other.savetimeout);
            // 1000 milisec = 1 sec
        } else {
            document.onkeyup = document.onkeydown = document.onmousemove = function () {
                justsaved = false;
                document.onkeyup = resetTimer;
                document.onkeydown = resetTimer;
                document.onmousemove = resetTimer;
            }
        }
    }

    function startSaving() {
        setTimeout(function () {
            window.onload = resetTimer;
            document.onkeyup = resetTimer;
            document.onkeydown = resetTimer;
            document.onmousemove = resetTimer;
            window.onbeforeunload = function () {
                if (savedBefore) {
                    saveWorkflow();
                }
            }
        }, config.other.savetimeout);

        $("#saveFlow").removeClass("collapse");
        $("#saveFlow").on('click touchstart', function () {
            autosavemode = false;
            saveWorkflow();
        });

        $("#addEntry").removeClass("collapse");
        //comment this out to disable autosave initially
        try {
            setTimeout(saveWorkflow(), 250);
        } catch (error) {
            //console.log("type-error for jquery (ignore)")
        }
    }

    function generateWorkflow() {
        $("#workflowInfo").removeClass("collapse");
        //console.log("generate workflow");
        firebase.database().ref('workflows/' + workflowId).once('value').then(function (workflow) {
            //var workflowKey = workflow.key;
            //console.log(workflowKey);
            workflowData = workflow.val();
            //console.log(workflowData);
            var time = workflowData.time;
            //console.log("time: " + time);
            var workflowArray = workflowData.workflow;
            //console.log(workflowArray);
            var name = workflowData.name;
            $("#name").val(name);
            for (var i = 0; i < workflowArray.length; i++) {
                //console.log(workflowArray[i]);
                var email = workflowArray[i].value;
                //console.log(email);
                var entrycountstring = '' + entrycount;
                //console.log(entrycountstring);
                $("#entry" + entrycountstring).val(email);
                addWorkflowEntry();
            }
            startSaving();
        }).catch(function (error) {
            handleError({
                code: "auth/invalid-workflow-id",
                message: "Invalid workflow id."
            });
        });
    }

    function checkEditAccess() {
        firebase.database().ref('access/workflows/workflowsbyuser/' + window.userId + '/' + workflowId).once('value').then(function (accessWorkflow) {
            var accessData = accessWorkflow.val();
            //console.log(accessData);
            window.access = accessData.access;
            window.role = accessData.role;
            //console.log("access: " + window.access);
            //console.log("role: " + window.role);
        }).then(function () {
            if (window.access === "edit") {
                //console.log("edit access!");
                addWorkflowEntry();
                generateWorkflow();
            } else {
                //console.log("no edit access");
            }
        }).catch(function (error) {
            //console.log("no edit access: " + error);
            handleError({
                code: "auth/no-edit-access",
                message: "You do not have permission to edit this workflow."
            });
            //console.log("redirecting to dashboard page");
            setTimeout(function () {
                window.location.href = 'dashboard.html';
            }, config.other.redirecttimeout);
        });
    }

    var user = firebase.auth().currentUser;
    if (user) {
        window.userId = user.uid;
        window.email = user.email;
        var testemail = new RegExp(config.regex.companyemailregex, 'g');
        if (!(testemail.test(window.email))) {
            window.location.href = "responses.html";
        }
        var urlMode = $.urlParam('mode');
        if (urlMode === "edit") {
            workflowId = $.urlParam('workflowid');
            if (workflowId == "") {
                //console.log("invalid workflow id");
                handleError({
                    code: "auth/invalid-workflow-id",
                    message: "Invalid workflow id."
                });
            } else {
                //console.log(urlMode, workflowId);
                checkEditAccess();
            }
        } else {
            $("#workflowInfo").removeClass("collapse");
            addWorkflowEntry();
            startSaving();
        }

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

function addWorkflowEntry() {
    var entryid = "entry";
    if (entrycount == -1) {
        //console.log("starting count");
        entrycount = 0;
    } else {
        entrycount++;
    }
    var entrycountstr = '' + entrycount;
    entryid = entryid + entrycountstr;
    $("#workflow-container").append("<div class=\"row justify-content-center\"><div class=\"col-5\"><div class=\"form-group\"><input type=\"text\" id=\"" +
        entryid + "\" class=\"form-control\" name=\"workflow\"></div></div><div class=\"col-sm-2\"><button class=\"entryDelete btn btn-primary btn-block onclick=\"void(0)\"\">Delete</button></div></div>");
    $("#" + entryid).rules("add", {
        regex: config.regex.commaseperatedemails,
        messages: {
            regex: "Please enter valid emails."
        }
    });
    $("#" + entryid).focus();
    $("#" + entryid).keypress(function (event) {
        //query to check if user exists here, and if not, warn the user with the jquery validation thing.
        if (event.which == '13') {
            event.preventDefault();
            addWorkflowEntry();
            $("#" + entryid).off();
        }
    });

}

$(document).ready(function () {

    $('#toslink').attr('href', config.other.tosUrl);
    $('#privacypolicylink').attr('href', config.other.privacyPolicyUrl);

    $("#name").focus(function () {
        $(this).select();
    });

    $.validator.addMethod(
        "regex",
        function (value, element, regexp) {
            var re = new RegExp(regexp, 'i');
            return this.optional(element) || re.test(value);
        },
        ""
    );

    $("#logoutButton").on('click touchstart', function () {
        firebase.auth().signOut().then(function () {
            // Sign-out successful.
        }).catch(function (error) {
            // An error happened.
            handleError(error);
        });
    });

    $("#goBack").on('click touchstart', function () {
        window.location.href = "flows.html";
    });

    $("#addEntry").on('click touchstart', function () {
        addWorkflowEntry();
    });

    $(document).on('click touchstart', ".entryDelete", function () {
        $(this).closest('.row').remove();
    });

    $.urlParam = function (name) {
        try {
            var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
            //console.log(results)
            return results[1] || 0;
        } catch (err) {
            //console.log(err);
            return "";
        }
    }

    var signed_in_initially = false;
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            //console.log("signed in");
            signed_in_initially = true;
            createWorkflowGenerator();
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

    $("#workflow-builder").validate({
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
});