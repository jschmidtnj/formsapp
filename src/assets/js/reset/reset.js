var jQuery = require("jquery");
require('jquery-validation');
require("popper.js");
require("bootstrap");
var $script = require('scriptjs');
window.$ = window.jQuery = jQuery;

$script.path('assets/js/');
$script('global/loginCSSHelper.js');

var config = require('../../../config/config.json');

var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");

firebase.initializeApp(config.firebase);

firebase.auth().useDeviceLanguage();

function handleError(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    //console.log(errorCode, errorMessage);
    var customMessage = "";
    if (errorCode == "auth/invalid-code") {
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
    $('#alertresetfailure').fadeIn();
    setTimeout(function () {
        $('#alertresetfailure').fadeOut();
        setTimeout(function () {
            //console.log("redirecting to login")
            window.location.href = 'login.html';
        }, config.other.redirecttimeout);
    }, config.other.alerttimeout);
}

$(document).ready(function () {

    $('#toslink').attr('href', config.other.tosUrl);
    $('#privacypolicylink').attr('href', config.other.privacyPolicyUrl);

    $.urlParam = function (name) {
        try {
            var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
            //console.log(results)
            return results[1] || 0;
        }
        catch(err) {
            //console.log(err);
            return ""
        }
    }

    var code = $.urlParam('oobCode');
    if (code === "") {
        handleError({
            code: "auth/invalid-code",
            message: "Invalid reset URL."
        });
    }
    firebase.auth().verifyPasswordResetCode(code).then(function (email) {
        // Display a "new password" form with the user's email address
        $("#emailaddress").text(email);
        //console.log("password reset link verified");
    }).catch(function () {
        // Invalid code
        handleError({
            code: "auth/invalid-code",
            message: "Invalid reset URL."
        });
    });


    $("#resetPassword").on('click touchstart', function () {
        if ($("#resetForm").valid()) {
            var formData = $("#resetForm").serializeArray();
            var newPassword = formData[0].value.toString();
            firebase.auth().confirmPasswordReset(code, newPassword).then(function () {
                // Success
                //console.log("reset sent");
                $('#alertresetsuccess').fadeIn();
                setTimeout(function () {
                    $('#alertresetsuccess').fadeOut();
                    setTimeout(function () {
                        //console.log("redirecting to login");
                        window.location.href = 'login.html';
                    }, config.other.redirecttimeout);
                }, config.other.alerttimeout);
            }).catch(function () {
                // Something went wrong
                handleError(error);
            });
        } else {
            //console.log("invalid input");
        }
    });

    $.validator.addMethod(
        "regex1",
        function (value, element, regexp) {
            var re = new RegExp(regexp, 'i');
            return this.optional(element) || re.test(value);
        },
        ""
    );

    $.validator.addMethod(
        "regex2",
        function (value, element, regexp) {
            var re = new RegExp(regexp, 'i');
            return this.optional(element) || re.test(value);
        },
        ""
    );

    $.validator.addMethod(
        "regex3",
        function (value, element, regexp) {
            var re = new RegExp(regexp, 'i');
            return this.optional(element) || re.test(value);
        },
        ""
    );

    $("#resetForm").validate({
        rules: {
            password: {
                required: true,
                minlength: 6,
                maxlength: 15,
                regex1: config.regex.passwordcontainsletter,
                regex2: config.regex.passwordcontainsnumber,
                regex3: config.regex.passwordcontainsspecialcharacter
            },
            confirm_password: {
                required: true,
                equalTo: "#password"
            }
        },
        messages: {
            password: {
                required: "Please provide a password",
                minlength: "Your password must be at least 6 characters long",
                maxlength: "Your password cannot exceed 15 characters",
                regex1: "Your password must contain at least one alpha-numerical character",
                regex2: "Your password must contain at least one digit (0-9)",
                regex3: "Your password must contain at least one special character (!@#$%^&*)"
            },
            confirm_password: {
                required: "Please provide a password",
                equalTo: "Please enter the same password as above"
            }
        },
        errorElement: "div",
        errorPlacement: function (error, element) {
            // Add the `invalid-feedback` class to the div element
            error.addClass("invalid-feedback");
            error.insertAfter(element);
        },
        highlight: function (element, errorClass, validClass) {
            $(element).addClass("is-invalid").removeClass("is-valid");
        },
        unhighlight: function (element, errorClass, validClass) {
            $(element).addClass("is-valid").removeClass("is-invalid");
        }
    });
});