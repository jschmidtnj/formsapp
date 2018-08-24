var jQuery = require("jquery");
require("popper.js");
require("bootstrap");
var $script = require("scriptjs");
//var jQuery = require("jquery-ui");
window.$ = window.jQuery = jQuery;
require("bootstrap-select");
require("bootstrap-select/dist/css/bootstrap-select.css");

var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");
var config = require('../../../config/config.json');
firebase.initializeApp(config.firebase);

function handleError(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    //console.log(errorCode, errorMessage);
    var customMessage = "";
    if (errorCode == "auth/notsignedin" || errorCode == "auth/invalid-form-id" || errorCode == "auth/no-edit-access" || errorCode == "auth/cannot-get-workflows") {
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

var formId = "";
var formData;
var inactiveTime;
var justsaved = false;
var autosavemode = true;
var formBuilder;
var justcreated = true;
var savedBefore = false;
var workflowSelect = "";
var lastWorkflowSelect = "";

function createFormGenerator() {
    $script.get('https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js', function () {

        function saveForm(formBuilder) {
            var formInfoData = $("#formInfo").serializeArray();
            //console.log(formInfoData);
            window.formName = formInfoData[0].value;
            try {
                formData = formBuilder.actions.getData('json');
            } catch (error) {
                //console.log("type error: " + error);
            }
            var dateTime = Date.now();
            //var user = firebase.auth().currentUser;
            //console.log(formId);
            if (formId !== "") {
                //console.log(JSON.stringify(formData), formId);
                if (JSON.stringify(formData) == "\"[]\"") {
                    firebase.database().ref('forms/' + formId).remove();
                    firebase.database().ref('access/forms/formsbyuser/' + window.userId + '/' + formId).remove();
                    firebase.database().ref('access/forms/formsbyid/' + formId + '/' + window.userId).remove();
                    //console.log("removed data");
                    formId = "";
                    workflowSelect = "";
                    justcreated = true;
                } else {
                    firebase.database().ref('forms/' + formId).set({
                        form: formData,
                        time: dateTime,
                        sharing: "private",
                        name: window.formName,
                        workflow: workflowSelect
                    }).then(function () {
                        if (justcreated) {
                            firebase.database().ref('access/forms/formsbyuser/' + window.userId + '/' + formId).set({
                                access: "edit",
                                role: "owner",
                                formId: formId
                            }).then(function () {
                                firebase.database().ref('access/forms/formsbyid/' + formId + '/' + window.userId).set({
                                    access: "edit",
                                    role: "owner",
                                    email: window.email
                                }).then(function () {
                                    //console.log("form data updated");
                                    if (!autosavemode) {
                                        $('#alertsavesuccess').fadeIn();
                                        setTimeout(function () {
                                            $('#alertsavesuccess').fadeOut();
                                        }, config.other.redirecttimeout);
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
                            //console.log("form data updated");
                        }
                    }).catch(function (error) {
                        handleError(error);
                    });
                }
            } else {
                if (JSON.stringify(formData) !== "\"[]\"") {
                    savedBefore = true;
                    if (formId == "") {
                        //console.log(formId);
                        formId = firebase.database().ref().child('forms').push().key;
                    }
                    firebase.database().ref('forms/' + formId).set({
                        form: formData,
                        time: dateTime,
                        sharing: "private",
                        name: window.formName,
                        workflow: workflowSelect
                    }).then(function () {
                        //console.log(formId);
                        //console.log("form data saved");
                        firebase.database().ref('access/forms/formsbyuser/' + window.userId + '/' + formId).set({
                            access: "edit",
                            role: "owner",
                            formId: formId
                        }).then(function () {
                            firebase.database().ref('access/forms/formsbyid/' + formId + '/' + window.userId).set({
                                access: "edit",
                                role: "owner",
                                email: window.email
                            }).then(function () {
                                if (!autosavemode) {
                                    $('#alertsavesuccess').fadeIn();
                                    setTimeout(function () {
                                        $('#alertsavesuccess').fadeOut();
                                    }, config.other.redirecttimeout);
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
                    if (formId !== "") {
                        $("#saving-status").text("saving...");
                        saveForm(formBuilder);
                        //console.log("form saved automatically");
                        $("#saving-status").text("saved");
                    } else {
                        $("#saving-status").text("saved");
                        saveForm(formBuilder);
                    }
                    justsaved = true;
                }, config.other.savetimeout);
                // 1000 milisec = 1 sec
            } else {
                document.onmousemove = document.onkeypress = function () {
                    justsaved = false;
                    document.onmousemove = resetTimer;
                    document.onkeypress = resetTimer;
                }
            }
        }

        function startSaving() {
            $("#clearForm").on('click touchstart', function () {
                //console.log("clear form");
                formBuilder.actions.clearFields();
            });
            setTimeout(function () {
                window.onload = resetTimer;
                document.onmousemove = resetTimer;
                document.onkeypress = resetTimer;
                window.onbeforeunload = function () {
                    if (savedBefore) {
                        saveForm(formBuilder);
                    }
                }
            }, config.other.savetimeout);

            $("#saveForm").on('click touchstart', function () {
                autosavemode = false;
                saveForm(formBuilder);
            });
            $("#viewForm").on('click touchstart', function () {
                window.location.href = 'view.html?mode=view&formid=' + formId;
            });
            $("#clearForm").removeClass("collapse");
            $("#saveForm").removeClass("collapse");
            $("#viewForm").removeClass("collapse");
            $("#workflowSelectCollapse").removeClass("collapse");
            //comment this out to disable autosave initially
            try {
                setTimeout(saveForm(formBuilder), 250);
            } catch (error) {
                //console.log("type-error for jquery (ignore)")
            }
        }

        function createworkflowSelect() {
            //console.log(window.userId);
            $("#formInfo").removeClass("collapse");
            firebase.database().ref('access/workflows/workflowsbyuser/' + window.userId).once('value').then(function (accessWorkflows) {
                var workflowSelectString = "<select class=\"selectpicker workflowSelect\" data-live-search=\"true\" id=\"workflowSelect\">" +
                    "<option data-tokens=\"none\" value=\"\">none</option>";
                accessWorkflows.forEach(function (accessWorkflow) {
                    var accessWorkflowVal = accessWorkflow.val();
                    var workflowId = accessWorkflow.key;
                    //console.log("workflow data: " + accessWorkflowVal, workflowId);
                    firebase.database().ref('workflows/' + workflowId).once('value').then(function (workflow) {
                        var workflowVal = workflow.val();
                        //console.log(workflow, workflowVal, workflowId);
                        var workflowName = workflowVal.name;
                        //console.log(workflowName);
                        workflowSelectString = workflowSelectString + "<option data-tokens=\"" + workflowName + "\" value=\"" + workflowId + "\">" + workflowName + "</option>";
                    });
                });
                setTimeout(function () {
                    workflowSelectString = workflowSelectString + "</select><br/><br/><br/><br/>";
                    $('#workflowSelect').selectpicker('destroy');
                    $('#workflowSelectCollapse').append(workflowSelectString);
                    $('#workflowSelect').selectpicker();
                    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
                        $('#workflowSelect').selectpicker('mobile');
                    }
                    $('.selectpicker').selectpicker();
                    //console.log("workflow select: " + workflowSelect);
                    if (workflowSelect !== "" && workflowSelect !== undefined && workflowSelect !== null) {
                        //console.log(workflowSelect);
                        $('.workflowSelect').val(workflowSelect);
                        $('.selectpicker').selectpicker('refresh');
                    }
                    $('.workflowSelect').on("change", function (elem) {
                        // on select update workflowSelect variable
                        //console.log($(this));
                        //console.log("changed value");
                        workflowSelect = elem.target.value;
                        //console.log("selected " + workflowSelect);
                        //console.log(workflowSelect);
                        if (workflowSelect == "") {
                            firebase.database().ref('workflows/' + lastWorkflowSelect + '/forms/' + formId).remove().then(function () {
                                //console.log("form removed", lastWorkflowSelect, formId);
                            }).catch(function (err) {
                                //console.log("error removing form");
                            });
                        } else {
                            firebase.database().ref('workflows/' + workflowSelect + '/forms/' + formId).set({
                                status: "submitted"
                            }).then(function () {
                                lastWorkflowSelect = workflowSelect;
                                //console.log("form added");
                            }).catch(function (error) {
                                handleError(error);
                            });
                        }
                    });
                    startSaving();
                }, config.other.datatimeout);
            }).catch(function (error) {
                handleError({
                    code: "auth/cannot-get-workflows",
                    message: "Workflows invalid. Try deleting your workflows."
                });
            });
        }

        function generateForm() {
            firebase.database().ref('forms/' + formId).once('value').then(function (theform) {
                //console.log("asdfasdfsadf");
                var formKey = theform.key;
                //console.log(formKey);
                var formDataVal = theform.val();
                //console.log(formDataVal);
                //var time = formData.time;
                //console.log("time: " + time);
                //console.log(formData.form);
                var formArray = JSON.parse(formDataVal.form);
                var formArrayString = JSON.stringify(formArray);
                formData = formArrayString;
                //console.log("form: " + formArrayString);
                var options = {
                    disabledAttrs: ["access"],
                    defaultFields: formArray,
                    showActionButtons: false, // defaults: `true`
                    disableFields: ['hidden']
                };
                var fbEditor = $('#form-builder');
                formBuilder = $(fbEditor).formBuilder(options);
                //console.log(formData);
                workflowSelect = formDataVal.workflow;
                //console.log(workflowSelect);
                window.formName = formDataVal.name;
                $("#name").val(window.formName);
                //console.log("current name: " + window.formName);
                createworkflowSelect();
                //add default workflow to currently selected
                //$("#mydropdownlist").val("thevalue");
            }).catch(function (error) {
                handleError({
                    code: "auth/invalid-form-id",
                    message: "Invalid form id."
                });
            });
        }

        function checkEditAccess() {
            firebase.database().ref('access/forms/formsbyuser/' + window.userId + '/' + formId).once('value').then(function (accessForm) {
                var accessData = accessForm.val();
                //console.log(accessData);
                window.access = accessData.access;
                window.role = accessData.role;
                //console.log("access: " + window.access);
                //console.log("role: " + window.role);
            }).then(function () {
                if (window.access === "edit") {
                    //console.log("edit access!");
                    generateForm();
                } else {
                    //console.log("no edit access");
                }
            }).catch(function (error) {
                //console.log("no edit access: " + error);
                handleError({
                    code: "auth/no-edit-access",
                    message: "You do not have permission to edit this form."
                });
                //console.log("redirecting to dashboard page");
                setTimeout(function () {
                    window.location.href = 'dashboard.html';
                }, config.other.redirecttimeout);
            });
        }

        require("formBuilder/dist/form-builder.min.js");
        var user = firebase.auth().currentUser;
        if (user) {
            var urlMode = $.urlParam('mode');
            if (urlMode === "edit") {
                formId = $.urlParam('formid');
                if (formId == "") {
                    handleError({
                        code: "auth/invalid-form-id",
                        message: "Invalid form id."
                    });
                } else {
                    //console.log(urlMode, formId);
                    checkEditAccess();
                }
            } else {
                var options = {
                    disabledAttrs: ["access"],
                    showActionButtons: false, // defaults: `true`
                    disableFields: ['hidden']
                };
                var fbEditor = $('#form-builder');
                formBuilder = $(fbEditor).formBuilder(options);
                createworkflowSelect();
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
    });
}

$(document).ready(function () {

    $('#toslink').attr('href', config.other.tosUrl);
    $('#privacypolicylink').attr('href', config.other.privacyPolicyUrl);

    $("#name").focus(function () {
        $(this).select();
    });

    $("#logoutButton").on('click touchstart', function () {
        firebase.auth().signOut().then(function () {
            // Sign-out successful.
        }).catch(function (error) {
            // An error happened.
            handleError(error);
        });
    });

    $("#goBack").on('click touchstart', function () {
        window.location.href = "user.html";
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
            window.userId = user.uid;
            window.email = user.email;
            var testemail = new RegExp(config.regex.companyemailregex, 'g');
            if (!(testemail.test(window.email))) {
                window.location.href = "responses.html";
            }
            createFormGenerator();
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
});