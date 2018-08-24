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
    }, 2000);
}

var tableInitialized = false;

var filedata = {};

$(document).ready(function () {

    $('#toslink').attr('href', config.other.tosUrl);
    $('#privacypolicylink').attr('href', config.other.privacyPolicyUrl);

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

    /*
    $(document).on("click", ".responseDelete", function () {
        var valueArray = $(this).attr('value').split(',');
        var responseid = valueArray[0];
        var started = false;

        function deleteForm() {
            //console.log("delete the response");
            firebase.database().ref('responses/' + window.formId + '/' + responseid).remove().then(function () {
                $("#responsedatabody").remove();
                $("#responsedataheader").remove();
                $("#responsedatalist").append("<thead id=\"responsedataheader\"><tr id=\"responsedataheaderrow\"></tr></thead>");
                $("#responsedatalist").append("<tbody id=\"responsedatabody\"></tbody>");
                setTimeout(function () {
                    $('#alertconfirmdelete').fadeOut();
                }, 500);
                getResponseData();
            }).catch(function (error) {
                handleError(error);
            });
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
    });
    */

    function getResponseData() {
        var ranonce = false;
        window.exitnow = false;
        //console.log(window.formId);
        var headers = [];
        var headerdatastring = "<th>Email</th><th>Time</th>";
        var regexname = /\[|\]/gi;
        var fileids = [];
        var filenames = [];
        var inputs = [];

        function generateTable() {
            if (!(ranonce)) {
                $("#noresponseswarning").removeClass("collapse");
                $("#responsedatalist").addClass("collapse");
            } else {
                if (!(tableInitialized)) {
                    $('#responsedatalist').DataTable({
                        responsive: true,
                        "order": [
                            [1, "desc"]
                        ]
                    });
                    tableInitialized = true;
                }
            }
        }
        firebase.database().ref('responses/' + window.formId).limitToFirst(config.other.responseviewmax).once('value').then(function (responses) {
            responses.forEach(function (response) {
                //var responseKey = response.key;
                //console.log(responseKey);
                var responseValue = response.val();
                var responseid = response.key;
                try {
                    var responseData = responseValue.data;
                    if (responseValue.data == undefined) {
                        throw "no data";
                    }
                } catch (err) {
                    firebase.database().ref('responses/' + window.formId + '/' + responseid).remove().then(function () {
                        $("#responsedatabody").remove();
                        $("#responsedataheader").remove();
                        $("#responsedatalist").append("<thead id=\"responsedataheader\"><tr id=\"responsedataheaderrow\"></tr></thead>");
                        $("#responsedatalist").append("<tbody id=\"responsedatabody\"></tbody>");
                        handleError({
                            code: "data/no-data",
                            message: "There is no data from one or more entries in the form because it consists of just one checkbox that was unchecked."
                        });
                        window.exitnow = true;
                        setTimeout(function () {
                            getResponseData();
                        }, 1000);
                    }).catch(function (error) {
                        handleError(error);
                    });
                }
                try {
                    //console.log(responseData);
                    for (var i in responseData) {
                        var name = responseData[i].name.replace(regexname, '');
                        //console.log(name);
                        if (!(headers.includes(name))) {
                            headers.push(name);
                            headerdatastring = headerdatastring + '<th>' + name + '</th>'
                        }
                    }
                } catch (err) {
                    //console.log(err);
                    return;
                }
                try {
                    var filedataval = responseValue.files;
                    //console.log(filedataval);
                    fileids = filedataval.fileids;
                    filenames = filedataval.filenames;
                    inputs = filedataval.inputs;
                    //console.log(fileids, filenames, inputs);
                    for (var i = 0; i < inputs.length; i++) {
                        var headerincludes = headers.includes(inputs[i]);
                        //console.log(headerincludes);
                        if (!(headerincludes)) {
                            //console.log("adding header");
                            headers.push(inputs[i]);
                            //console.log(inputs[i], headers);
                            //console.log("added header");
                            filedata[inputs[i]] = {};
                            filedata[inputs[i]].fileids = [];
                            //console.log("added file id field");
                            filedata[inputs[i]].filenames = [];
                            //console.log("added file name field");
                            var manyfiledownloadbutton = "";
                            if (fileids[i] !== "nofiles") {
                                manyfiledownloadbutton = "<button value=\"" +
                                    "" + "," + inputs[i] + "\" class=\"downloadFiles " +
                                    "btn btn-primary btn-block onclick=\"void(0)\"\">Download All</button>";
                            }
                            headerdatastring = headerdatastring + '<th>' + inputs[i] + manyfiledownloadbutton + '</th>';
                            //console.log(headerdatastring);
                        }
                        filedata[inputs[i]].fileids.push(fileids[i]);
                        //console.log("pushed file id");
                        filedata[inputs[i]].filenames.push(filenames[i]);
                        //console.log("pushed file name");
                    }
                    //console.log(filedata);
                    //console.log(headerdatastring);
                } catch (err) {
                    //no files
                    //console.log("no files");
                }
            });
            if (window.exitnow) {
                return;
            }
            headerdatastring = headerdatastring + '<th>View</th>'; //+ '<th>Delete</th>';
            //console.log(headerdatastring);
            //console.log(headerdatastring);
            //for each header, get the options (option 1, 2, 3 values)
            var optionlabels = {};
            firebase.database().ref('forms/' + window.formId).once('value').then(function (form) {
                var formDataVal = form.val().form;
                //console.log(formDataVal);
                var jsonobj = JSON.parse(formDataVal);
                for (var i = 0; i < jsonobj.length; i++) {
                    if (jsonobj[i].values !== undefined && jsonobj[i].values !== null && jsonobj[i].values !== "") {
                        var fieldname = jsonobj[i].name;
                        //console.log(fieldname);
                        var newoptiondata = {};
                        var labels = [];
                        var values = [];
                        for (var j = 0; j < jsonobj[i].values.length; j++) {
                            labels.push(jsonobj[i].values[j].label);
                            values.push(jsonobj[i].values[j].value);
                        }
                        newoptiondata.labels = labels;
                        newoptiondata.values = values;
                        optionlabels[fieldname] = newoptiondata;
                        //console.log(optionlabels);
                    }
                }
                var numResponses = responses.numChildren();
                var countResponses = 0;
                responses.forEach(function (response) {
                    var responseid = response.key;
                    //console.log(responseid);
                    var responseValue = response.val();
                    var responseData = responseValue.data;
                    //console.log(responseData);
                    var bodydatastring = "<tr>";
                    var userId = responseValue.userId;
                    //console.log(userId);
                    var respemail = "";
                    var currentResponseInputs = [];
                    var currentFileInputIds = [];
                    try {
                        var filedataval = responseValue.files;
                        //console.log(filedataval);
                        inputs = filedataval.inputs;

                        //console.log(inputs);
                        for (var i = 0; i < inputs.length; i++) {
                            var inputincludes = currentResponseInputs.includes(inputs[i]);
                            //console.log(inputincludes);
                            if (!(inputincludes)) {
                                //console.log("adding input");
                                currentResponseInputs.push(inputs[i]);
                                currentFileInputIds.push(fileids[i]); //use this to determine if files were added
                                //to current input
                            }
                        }
                    } catch (err) {
                        //no files
                        //console.log("no files");
                    }

                    firebase.database().ref('users/' + userId).once('value').then(function (users) {
                        var userData = users.val();
                        //console.log(userData);
                        respemail = userData.email;
                        //console.log(respemail);
                        bodydatastring = bodydatastring + '<td>' + respemail + '</td>';
                        var utctime = new Date(responseValue.time);
                        var time = utctime.toString();
                        //console.log(time);
                        bodydatastring = bodydatastring + '<td>' + time + '</td>';
                        for (var j = 0; j < headers.length; j++) {
                            if (currentResponseInputs.includes(headers[j])) {
                                var currentResponseInputIndex = currentResponseInputs.indexOf(headers[j]);
                                //console.log(currentResponseInputIndex);
                                if (currentFileInputIds[currentResponseInputIndex] !== "nofiles") {
                                    //header is a file input - create download button for files
                                    var filedownloadbutton = "<button value=\"" + responseid + "," +
                                        "" + "\" class=\"downloadFiles " +
                                        "btn btn-primary btn-block onclick=\"void(0)\"\">Download</button>";
                                    bodydatastring = bodydatastring + '<td>' + filedownloadbutton + '</td>';
                                } else {
                                    bodydatastring = bodydatastring + '<td>' + "no files added" + '</td>';
                                }
                                gotDatapoint = true;
                            } else if (filedata.hasOwnProperty(headers[j])) {
                                bodydatastring = bodydatastring + '<td>' + "no files added" + '</td>';
                                gotDatapoint = true;
                            } else {
                                var gotDatapoint = false;
                                for (var i in responseData) {
                                    var datapoint = responseData[i];
                                    var datapointname = datapoint.name.replace(regexname, '');
                                    //console.log(datapointname, datapoint.value);
                                    if (headers[j] == datapointname) {
                                        if (optionlabels.hasOwnProperty(datapointname)) {
                                            //console.log("getting index of option label");
                                            var optionlabeldata = optionlabels[datapointname].values;
                                            //console.log(optionlabeldata, datapoint.value);
                                            var indexOfValue = optionlabeldata.indexOf(datapoint.value);
                                            //console.log(indexOfValue);
                                            if (indexOfValue > -1) {
                                                bodydatastring = bodydatastring + '<td>' + optionlabels[datapointname].labels[indexOfValue] + '</td>';
                                            } else {
                                                if (datapoint.value !== "" && datapoint.value !== undefined && datapoint.value !== null && datapoint.value !== "") {
                                                    bodydatastring = bodydatastring + '<td>' + datapoint.value + '</td>';
                                                } else {
                                                    //console.log("error getting value");
                                                    bodydatastring = bodydatastring + '<td></td>';
                                                }
                                            }
                                        } else {
                                            if (datapoint.value !== "" && datapoint.value !== undefined && datapoint.value !== null && datapoint.value !== "") {
                                                bodydatastring = bodydatastring + '<td>' + datapoint.value + '</td>';
                                            } else {
                                                //console.log("error getting value");
                                                bodydatastring = bodydatastring + '<td></td>';
                                            }
                                        }
                                        gotDatapoint = true;
                                        break;
                                    }
                                }
                            }
                            if (!(gotDatapoint)) {
                                bodydatastring = bodydatastring + '<td></td>';
                            }
                        }
                        bodydatastring = bodydatastring + "<td><button value=\"" + window.formId + "," + responseid +
                            "\" class=\"formView btn btn-primary btn-block\">View</button>" + "</td></tr>";
                        // + '</td><td><button value=\"" + responseid + "\" class=\"responseDelete btn btn-primary btn-block\">Delete</button></td></tr>";

                        if (!(ranonce)) {
                            ranonce = true;
                            $('#responsedataheaderrow').append(headerdatastring);
                            $("#noresponseswarning").addClass("collapse");
                            $("#responsedatalist").removeClass("collapse");
                        }
                        $('#responsedatabody').append(bodydatastring);
                        countResponses++;
                        if (countResponses == numResponses) {
                            generateTable();
                        }
                    });
                });
                //console.log(window.formId);
                firebase.database().ref('forms/' + window.formId).once('value').then(function (response) {
                    //console.log(response);
                    $("#form-name").text(response.val().name);
                }).catch(function (error) {
                    handleError(error);
                });
            }).catch(function (err) {
                //console.log("could not get form data");
            });
            setTimeout(function () {
                generateTable();
            }, config.other.datatimeout);
        }).catch(function (error) {
            handleError(error);
        });

        if (window.exitnow) {
            return;
        }
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
            window.urlMode = $.urlParam('mode');
            if (window.urlMode !== 'data') {
                handleError({
                    code: "auth/invalid-url-mode",
                    message: "Invalid URL mode"
                });
            } else {
                window.formId = $.urlParam('formid');
                if (window.formId == '') {
                    handleError({
                        code: "auth/invalid-formid",
                        message: "Invalid form-id"
                    });
                    window.location.href = 'user.html';
                } else {
                    firebase.database().ref('access/forms/formsbyuser/' + window.userId + '/' + window.formId).once('value').then(function (access) {
                        var accessData = access.val();
                        window.access = accessData.access;
                        if (window.access == 'edit') {
                            getResponseData();
                        } else {
                            handleError({
                                code: "auth/invalid-response-id",
                                message: "Invalid response-id"
                            });
                            window.location.href = 'user.html';
                        }
                    }).catch(function (err) {
                        handleError({
                            code: "auth/unauthorized-response-view",
                            message: "unauthorized to view page"
                        });
                        window.location.href = 'user.html';
                    });
                }
            }
        } else {
            // No user is signed in. redirect to login page:
            if (signed_in_initially) {
                $('#alertsignoutsuccess').fadeIn();
                setTimeout(function () {
                    $('#alertsignoutsuccess').fadeOut();
                    //console.log("redirecting to login page");
                    setTimeout(function () {
                        window.location.href = 'login.html';
                    }, 750);
                }, 3000);
            } else {
                //slow redirect
                handleError({
                    code: "auth/notsignedin",
                    message: "Not Signed in. Redirecting."
                });
                //console.log("redirecting to login page");
                setTimeout(function () {
                    window.location.href = 'login.html';
                }, 1500);
                //fast redirect
                // window.location.href = 'login.html';
            }
        }
    });

    $(document).on("click", ".formView", function () {
        var valueArray = $(this).attr('value').split(',');
        var formKey = valueArray[0];
        var responseid = valueArray[1];
        setTimeout(function () {
            window.location.href = 'view.html?mode=response&formid=' + formKey + '&responseid=' + responseid;
        }, 750);
    });

    $(document).on('click touchstart', ".downloadFiles", function () {
        var valueArray = $(this).attr('value').split(',').map(function (item) {
            return item.trim();
        });
        var responseId = valueArray[0];
        var inputField = valueArray[1];

        function downloadTheFiles(fileids, filenames) {
            var urlArray = [];
            var counturl = 0;
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
        }
        //console.log(responseId, inputField);
        if (responseId == "" && inputField !== "") {
            //download all files from input field
            //console.log("download many files");
            var fileids = filedata[inputField].fileids;
            var filenames = filedata[inputField].filenames;
            //console.log(fileids, filenames);
            downloadTheFiles(fileids, filenames);
        } else {
            firebase.database().ref('responses/' + window.formId + '/' + responseId).once('value').catch(function (error) {
                handleError(error);
            }).then(function (response) {
                responseVal = response.val();
                var files = responseVal.files;
                //console.log(files);
                var fileids = files.fileids;
                var filenames = files.filenames;
                //console.log(fileids, filenames);
                downloadTheFiles(fileids, filenames);
            }).catch(function (err) {
                handleError(err);
            });
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