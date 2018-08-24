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
    if (errorCode == "auth/user-not-found") {
        customMessage = "Email not found";
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
    $('#alertemailfailure').fadeIn();
    setTimeout(function () {
        $('#alertemailfailure').fadeOut();
        /*
        setTimeout(function () {
            //console.log("redirecting to login")
            window.location.href = 'login.html';
        }, config.other.redirecttimeout);
        */
    }, config.other.alerttimeout);
}

$(document).ready(function () {

    $('#toslink').attr('href', config.other.tosUrl);
    $('#privacypolicylink').attr('href', config.other.privacyPolicyUrl);

    function resetTheEmail() {
        if ($("#forgotForm").valid()) {
            var formData = $("#forgotForm").serializeArray();
            var emailAddress = formData[0].value.toString();
            firebase.auth().sendPasswordResetEmail(emailAddress).then(function () {
                // Email sent.
                //console.log("email sent");
                $('#alertemailsuccess').fadeIn();
                setTimeout(function () {
                    $('#alertemailsuccess').fadeOut();
                    setTimeout(function () {
                        //console.log("redirecting to login");
                        window.location.href = 'login.html';
                    }, config.other.redirecttimeout);
                }, config.other.alerttimeout);
            }).catch(function (error) {
                // An error happened.
                handleError(error);
            });
        } else {
            //console.log("invalid input");
        }
    }
    
    $("#sendResetEmail").on('click touchstart', function () {
        resetTheEmail();
    });

    $("#sendResetEmail").keypress(function (event) {
        if (event.which == '13') {
            event.preventDefault();
            resetTheEmail();
        }
    });

    $.validator.addMethod(
        "regex",
        function (value, element, regexp) {
            var re = new RegExp(regexp, 'i');
            return this.optional(element) || re.test(value);
        },
        ""
    );

    $("#forgotForm").validate({
        rules: {
            email: {
                required: true,
                regex: config.regex.validemail,
                maxlength: 50
            }
        },
        messages: {
            email: "Please enter a valid email address"
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