var jQuery = require("jquery/dist/jquery.min.js");
require("popper.js");
require("bootstrap");
var $script = require("scriptjs");
//var jQuery = require("jquery-ui");
window.$ = window.jQuery = jQuery;

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
    if (errorCode == "auth/notsignedin") {
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
var inactiveTime;
var justsaved = false;
var autosavemode = true;
var formBuilder;
var editKey = "";

function createFormGenerator() {
    $script.get('https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js', function () {
        require("formBuilder/dist/form-builder.min.js");
        var options = {
            showActionButtons: false, // defaults: `true`
            disableFields: ['hidden']
        };
        var fbEditor = $('#form-builder');
        formBuilder = $(fbEditor).formBuilder(options);
        $("#clearForm").on('click touchstart', function () {
            //console.log("clear form");
            formBuilder.actions.clearFields();
        });

        function saveForm(formBuilder) {
            try {
                formData = formBuilder.actions.getData('json');
            }
            catch (error) {
                //console.log("type error: " + error);
            }
            var dateTime = Date.now();
            var user = firebase.auth().currentUser;
            if (user) {
                var userId = user.uid;

                //console.log(JSON.stringify(formData), formId);
                if (formId !== "") {
                    //console.log(JSON.stringify(formData), formId);
                    if (JSON.stringify(formData) == "\"[]\"") {
                        firebase.database().ref('forms/' + formId).remove();
                        //console.log("removed data");
                        formId = "";
                    } else {
                        firebase.database().ref('forms/' + formId).set({
                            form: formData,
                            time: dateTime,
                            sharing: "private"
                        }).then(function () {
                            firebase.database().ref('access/forms/formsbyuser/' + userId + '/' + editKey).set({
                                formId: formId
                            }).then(function () {
                                //console.log("form data updated");
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
                    }
                } else {
                    if (JSON.stringify(formData) !== "\"[]\"") {
                        formId = firebase.database().ref().child('forms').push().key;
                        firebase.database().ref('forms/' + formId).update({
                            form: formData,
                            time: dateTime,
                            sharing: "private"
                        }).then(function () {
                            //console.log(formId);
                            //console.log("form data saved");
                            editKey = firebase.database().ref().child('access/forms/formsbyuser/' + userId).push().key;
                            firebase.database().ref('access/forms/formsbyuser/' + userId + '/' + editKey).update({
                                formId: formId
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
                    }
                }
            } else {
                //slow redirect
                handleError({
                    code: "auth/notsignedin",
                    message: "Not Signed in. Redirecting."
                });
                //console.log("redirecting to login page");
                setTimeout(function () {
                    window.location.href = config.other.redirecttimeout;
                }, config.other.redirecttimeout);
                //fast redirect
                // window.location.href = 'login.html';
            }
        }

        function resetTimer() {
            if (!justsaved) {
                clearTimeout(inactiveTime);
                inactiveTime = setTimeout(function () {
                    if (formId !== "") {
                        $("#saving-status").text("saving...")
                        saveForm(formBuilder);
                        //console.log("form saved automatically");
                        $("#saving-status").text("saved")
                    } else {
                        $("#saving-status").text("saved")
                        saveForm(formBuilder);
                    }
                    justsaved = true;
                }, config.other.savetimeout);
            } else {
                document.onmousemove = document.onkeypress = function () {
                    justsaved = false;
                    document.onmousemove = resetTimer;
                    document.onkeypress = resetTimer;
                }
            }
        }
        window.onload = resetTimer;
        document.onmousemove = resetTimer;
        document.onkeypress = resetTimer;
        window.onbeforeunload = saveForm;

        $("#saveForm").on('click touchstart', function () {
            autosavemode = false;
            saveForm(formBuilder);
        });
        $("#clearForm").removeClass("collapse");
        $("#saveForm").removeClass("collapse");
        //comment this out to disable autosave initially
        try {
            setTimeout(saveForm(formBuilder), 250);
        } catch (error) {
            //console.log("type-error for jquery (ignore)")
        }
    });
}

$(document).ready(function () {
    var signed_in_initially = false;
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            //console.log("signed in");
            window.email = user.email;
            var testemail = new RegExp(config.regex.companyemailregex, 'g');
            if (!(testemail.test(window.email))) {
                window.location.href = "responses.html";
            }
            signed_in_initially = true;
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
    $("#logoutButton").on('click touchstart', function () {
        firebase.auth().signOut().then(function () {
            // Sign-out successful.
        }).catch(function (error) {
            // An error happened.
            handleError(error);
        });
    });
});