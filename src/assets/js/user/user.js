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

var tableInitialized = false;

$(document).ready(function () {

    $('#toslink').attr('href', config.other.tosUrl);
    $('#privacypolicylink').attr('href', config.other.privacyPolicyUrl);

    function getFormData() {
        var ranonce = false;

        function generateDatatable() {
            if (!(ranonce)) {
                $("#noformswarning").removeClass("collapse");
                $("#userformlistcollapse").addClass("collapse");
                $("#selectactions").addClass("collapse");
            } else {
                if (!(tableInitialized)) {
                    $('#userformlist').DataTable({
                        responsive: true,
                        select: {
                            style: 'multi'
                        }
                    });
                    tableInitialized = true;
                }
            }
        }
        firebase.database().ref('access/forms/formsbyuser/' + window.userId).limitToLast(config.other.userviewmax).once('value').then(function (accessForms) {
            var numaccessforms = accessForms.numChildren();
            var countaccessForms = 0;
            accessForms.forEach(function (accessForm) {
                var formId = accessForm.key;
                //console.log(formId);
                var accessFormData = accessForm.val();
                var access = accessFormData.access;
                //console.log(access);
                firebase.database().ref('forms/' + formId).once('value').catch(function (error) {
                    handleError(error);
                }).then(function (form) {
                    var formKey = form.key;
                    //console.log(formKey);
                    var formData = form.val();
                    //console.log(formData);
                    var formName = formData.name;
                    try {
                        var utctime = new Date(formData.time);
                        var time = utctime.toString();
                    } catch (err) {
                        //console.log("undefined error: " + err);
                    }
                    //console.log("time: " + time);
                    try {
                        var formArray = JSON.parse(formData.form);
                    } catch (err) {
                        //console.log("undefined error: " + err);
                    }

                    //var formArrayString = JSON.stringify(formArray);
                    //console.log("form: " + formArrayString);
                    $('#userformdata').append("<tr><td>" + formName + "</td><td>" + time +
                        "</td><td><button value=\"" + formKey + "\" class=\"formData " +
                        "btn btn-primary btn-block onclick=\"void(0)\"\">Data</button></td><td>" +
                        "<button value=\"" + formKey + "\" class=\"formView " +
                        "btn btn-primary btn-block onclick=\"void(0)\"\">View</button></td><td>" +
                        "<button value=\"" + formKey + "\" class=\"formShare btn btn-primary " +
                        "btn-block onclick=\"void(0)\"\">Share</button></td><td>" +
                        "<button value=\"" + formKey + "\" class=\"formEdit " +
                        "btn btn-primary btn-block onclick=\"void(0)\"\">Edit</button></td><td>" +
                        "<button value=\"" + formKey + "\" class=\"formDelete " +
                        "btn btn-primary btn-block onclick=\"void(0)\"\">Delete</button></td></tr>");
                    if (!(ranonce)) {
                        ranonce = true;
                        $("#noformswarning").addClass("collapse");
                        $("#userformlistcollapse").removeClass("collapse");
                        $("#selectactions").removeClass("collapse");
                    }
                    countaccessForms++;
                    if (countaccessForms == numaccessforms) {
                        generateDatatable();
                    }
                });
            });
            setTimeout(function () {
                generateDatatable();
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
            getFormData();
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
        setTimeout(function () {
            window.location.href = 'view.html?mode=view&formid=' + formKey;
        }, config.other.redirecttimeout);
    });

    $(document).on('click touchstart', ".formData", function () {
        var valueArray = $(this).attr('value').split(',');
        var formKey = valueArray[0];
        setTimeout(function () {
            window.location.href = 'data.html?mode=data&formid=' + formKey;
        }, config.other.redirecttimeout);
    });

    $(document).on('click touchstart', ".formEdit", function () {
        var valueArray = $(this).attr('value').split(',');
        var formKey = valueArray[0];
        setTimeout(function () {
            window.location.href = 'edit.html?mode=edit&formid=' + formKey;
        }, config.other.redirecttimeout);
    });

    function deleteForm(formKey) {
        //console.log("delete the form");
        firebase.database().ref('forms/' + formKey).remove().then(function () {
            firebase.database().ref('access/forms/formsbyuser/' + window.userId + "/" + formKey).remove().then(function () {
                firebase.database().ref('responses/' + formKey).remove().then(function () {
                    firebase.database().ref('users/' + window.userId + "/responses/" + formKey).remove().then(function () {
                        $("#userformdata").remove();
                        $("#userformlist").append("<tbody id=\"userformdata\"></tbody>");
                        setTimeout(function () {
                            $('#alertconfirmdelete').fadeOut();
                        }, config.other.alerttimeout);
                        getFormData();
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

    $(document).on('click touchstart', ".formDelete", function () {
        var valueArray = $(this).attr('value').split(',');
        var formKey = valueArray[0];
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
                deleteForm(formKey);
                started = true;
            }
        });
    });

    $(document).on('click touchstart', "#deleteSelected", function () {
        var started = false;
        var table = $('#userformlist').DataTable();
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
                    $('#userformdata').find('.selected').each(function () {
                        var valueArray = $(this).find('.formDelete').attr('value').split(',');
                        //console.log(valueArray);
                        var formid = valueArray[0];
                        deleteForm(formid);
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
        var table = $('#userformlist').DataTable();
        if (allselected) {
            table.rows().deselect();
            allselected = false;
        } else {
            table.rows().select();
            allselected = true;
        }
    });

    function shareForm(userId, formid, emailaddress) {
        //console.log("share the form");
        //console.log("user Id: " + userId);
        firebase.database().ref('access/forms/formsbyuser/' + userId + '/' + formid).set({
            access: "edit",
            role: "friend"
        }).then(function () {
            firebase.database().ref('access/forms/formsbyid/' + formid + '/' + userId).set({
                access: "edit",
                role: "friend",
                email: emailaddress
            }).then(function () {
                //console.log("form shared");
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
    var formIdArray = [];

    function addRemoveButton(id) {
        $('#' + id).on('click touchstart', function () {
            var delButton = $(this);
            //console.log(delButton);
            var valArr = delButton.attr('value').split(',');
            //console.log(valArr);
            var userid = valArr[0];
            var formId = valArr[1];
            var emailaddr = valArr[2];
            //console.log(userid, formId);
            var formIds = [formId];
            if (formIdArray !== undefined && formIdArray.length !== 0) {
                //console.log("remove selected shares");
                formIds = formIdArray;
                //console.log(formIds);
            }
            //must be 2 different loops to avoid asyncronous problems
            for (var i = 0; i < formIds.length; i++) {
                var formid = formIds[i]
                //console.log(userid, formid);
                firebase.database().ref('access/forms/formsbyuser/' + userid + "/" + formid).remove().then(function () {
                    //console.log(formid, userid);
                }).catch(function (error) {
                    handleError(error);
                });
                firebase.database().ref('access/forms/formsbyid/' + formid + "/" + userid).remove().then(function () {
                    //console.log("user deleted");
                    //console.log(userid, formid);
                    $('#' + id).off();
                }).catch(function (error) {
                    handleError(error);
                });
            }
            setTimeout(function () {
                removeShareFromArrays(emailaddr, userid);
                updateShareList(formIds, emails, userIds);
            }, config.other.datatimeout);
        });
    }

    function updateShareList(formids) {
        var sharedWithString = "<p id=\"sharedWithData\">";
        for (var i = 0; i < userIds.length; i++) {
            //console.log(emails[i], userIds[i]);
            if (emails[i] !== window.email) {
                sharedWithString = sharedWithString + emails[i] + "<button value=\"" + userIds[i] + ',' + formids[0] + ',' + emails[i] +
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

    function getInitialShares(formids) {
        //console.log("get initial shares: " + formids);
        var i = 0;
        for (var k = 0; k < formids.length; k++) {
            var currentId = formids[k];
            firebase.database().ref('access/forms/formsbyid/' + currentId).once('value').catch(function (error) {
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
                    //console.log(i, formids.length, count, numResults);
                    if (i == formids.length && count == numResults) {
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
                        updateShareList(formids);
                        return;
                    }
                });
            });
        }
    }

    function checkValidEmails(formids, value) {
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
                //console.log("emails includes email to add");
                firebase.database().ref().child('users').orderByChild('email').equalTo(emailToAdd).once('value').catch(function (error) {
                    //console.log(error);
                    updatedShare = false;
                    //console.log("could not find user");
                }).then(function (userData) {
                    var userId;
                    try {
                        userId = Object.keys(userData.val())[0];
                    } catch (err) {
                        //console.log("user id not found.");
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
            //console.log(updatedShare, updatecount);
            if (updatedShare && updatecount == emailslen) {
                newEmails = newEmails.concat(emailsToAdd);
                newUserIds = newUserIds.concat(userIdsToAdd);
                emails = emails.concat(emailsToAdd);
                userIds = userIds.concat(userIdsToAdd);
                //console.log(emails, newUserIds);
                updateShareList(formids, emails, userIds);
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
            $(".formShare").off();
            $(".removeShare").off();
            $("#shareablelink").remove();
            $("#enablesharing").remove();
            $("#copylink").remove();
            $(".footerdiv").remove();
            $("#shareablelinkcollapse").addClass("collapse");
            $("#copylink").off();
            $("#enablesharing").off();
            newEmails = [];
            newUserIds = [];
            emails = [];
            userIds = [];
            formIdArray = [];
        }
    }

    function getShareableLink(formid) {
        var url = window.location.href;
        var url_main = url.replace(/[^/]*$/, '');
        var new_url = url_main + 'view.html?mode=view&formid=' + formid;
        //console.log(url, url_main, new_url);
        $("#shareablelink").remove();
        firebase.database().ref("forms/" + formid).once('value').catch(function (err) {
            handleError(err);
        }).then(function (formData) {
            var formDataVal = formData.val();
            var formsharing = formDataVal.sharing;

            function getLinkSharingButtons(formsharing) {
                function copyToClipboard() {
                    $("#shareablelink").prop('disabled', false);
                    var copytext = document.getElementById("shareablelink");
                    copytext.select();
                    document.execCommand("copy");
                    $("#shareablelink").prop('disabled', true);
                }
                $("#shareablelink").remove();
                $("#enablesharing").remove();
                $("#copylink").off();
                $("#copylink").remove();
                $(".footerdiv").remove();
                $("#enablesharing").off();
                var enabledisablebuttonstring = "<button id=\"enablesharing\" class=\"btn " +
                    "btn-block onclick=\"void(0)\"\">";
                if (formsharing == "private") {
                    enabledisablebuttonstring = "<div class=\"footerdiv modal-footer\">" + enabledisablebuttonstring + "Enable Link Sharing" + "</button></div>";
                    $("#shareablelinkdata").append(enabledisablebuttonstring);
                    $("#shareablelinkcollapse").removeClass("collapse");
                } else if (formsharing == "public") {
                    enabledisablebuttonstring = enabledisablebuttonstring + "Disable Link Sharing</button></div>";
                    $("#shareablelinkdata").append(enabledisablebuttonstring);
                    var shareablelinkstring = "<div id=\"shareablelinkwrapper\"><input id=\"shareablelink\" type=\"text\" style=\"width:100%;\"></div>";
                    $("#shareablelinkdata").append(shareablelinkstring);
                    $("#shareablelink").val(new_url);
                    $("#shareablelink").prop('disabled', true);
                    var copylinkstring = "<div class=\"footerdiv modal-footer\"><button id=\"copylink\" class=\"btn " +
                        "btn-block onclick=\"void(0)\"\">Copy Link</button></div>";
                    $("#shareablelinkdata").append(copylinkstring);
                    $("#shareablelinkcollapse").removeClass("collapse");
                    $(document).on('click touchstart', "#copylink", function () {
                        copyToClipboard();
                    });
                    $(document).on('click touchstart', "#shareablelinkwrapper", function () {
                        copyToClipboard();
                    });
                }

                $("#enablesharing").on('click touchstart', function () {
                    if (formsharing == "private") {
                        formsharing = "public";
                    } else if (formsharing == "public") {
                        formsharing = "private";
                    }
                    firebase.database().ref("forms/" + formid).update({
                        sharing: formsharing
                    }).catch(function (err) {
                        handleError(err);
                    }).then(function () {
                        $("#shareablelink").remove();
                        $("#enablesharing").remove();
                        $("#copylink").off();
                        $("#copylink").remove();
                        $(".footerdiv").remove();
                        $("#enablesharing").off();
                        getLinkSharingButtons(formsharing);
                    });
                });
            }
            getLinkSharingButtons(formsharing);
        });
    }

    $(document).on('click touchstart', ".formShare", function () {
        var button = $(this);
        //console.log(button);
        var valueArray = button.attr('value').split(',');
        //console.log(valueArray);
        var formid = valueArray[0];
        var started = false;

        getInitialShares([formid]);
        getShareableLink(formid);

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
                    checkValidEmails([formid], data);
                }
            }
        });
        $("#saveShare").on('click touchstart', function () {
            if (!started) {
                //console.log(newUserIds);
                for (var i = 0; i < newUserIds.length; i++) {
                    shareForm(newUserIds[i], formid, newEmails[i]);
                }
                setTimeout(function () {
                    closemodal(started);
                    newEmails = [];
                    newUserIds = [];
                    emails = [];
                    userIds = [];
                    formIdArray = [];
                    started = true;
                }, config.other.datatimeout);
            }
        });
    });

    $(document).on('click touchstart', "#shareSelected", function () {
        var table = $('#userformlist').DataTable();
        if (table.rows('.selected').any()) {
            var started = false;
            $('#userformdata').find('.selected').each(function () {
                var valueArray = $(this).find('.formDelete').attr('value').split(',');
                //console.log(valueArray);
                var formid = valueArray[0];
                formIdArray.push(formid);
            });
            getInitialShares(formIdArray);
            setTimeout(function () {
                updateShareList(formIdArray);
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
                        checkValidEmails(formIdArray, data);
                    }
                }
            });
            $("#saveShare").on('click touchstart', function () {
                if (!started) {
                    //console.log(newUserIds);
                    for (var i = 0; i < newUserIds.length; i++) {
                        $('#userformdata').find('.selected').each(function () {
                            var valueArray = $(this).find('.formDelete').attr('value').split(',');
                            //console.log(valueArray);
                            var formid = valueArray[0];
                            shareForm(newUserIds[i], formid, newEmails[i]);
                        });
                    }
                    setTimeout(function () {
                        closemodal(started);
                        newEmails = [];
                        newUserIds = [];
                        emails = [];
                        userIds = [];
                        formIdArray = [];
                        started = true;
                    }, config.other.datatimeout);
                }
            });
        } else {
            //console.log("nothing selected.");
        }
    });

    $("#createForm").on('click touchstart', function () {
        window.location.href = "edit.html";
    });

    $("#viewResponses").on('click touchstart', function () {
        window.location.href = "responses.html";
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