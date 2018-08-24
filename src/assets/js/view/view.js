var jQuery = require('jquery');
require('jquery-validation');
require("popper.js");
require("bootstrap");
var $script = require("scriptjs");
//var jQuery = require("jquery-ui");
window.$ = window.jQuery = jQuery;
require("bootstrap-select");
require("bootstrap-select/dist/css/bootstrap-select.css");

var JSZip = require('jszip');
var JSZipUtils = require('jszip-utils');
var FileSaver = require('file-saver');

var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");
require("firebase/storage");
require("firebase/functions");
var config = require('../../../config/config.json');
firebase.initializeApp(config.firebase);

function handleError(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    //console.log(errorCode, errorMessage);
    var customMessage = "";
    if (errorCode == "auth/notsignedin" || errorCode == "auth/invalid-form-id" || errorCode == "auth/no-view-access" || errorCode == "auth/invalid-response-id" || errorCode == "auth/invalid-mode") {
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
    $('#alertsubmitfailure').fadeIn();
    setTimeout(function () {
        $('#alertsubmitfailure').fadeOut();
    }, config.other.alerttimeout);
}

function createworkflowSelect() {
    //console.log(window.createselectpicker);
    if (window.createselectpicker) {
        //console.log(window.userId);
        var createselect = true;
        firebase.database().ref('access/workflows/workflowsbyuser/' + window.userId).once('value').then(function (accessWorkflows) {
            var workflowSelectString = "<select required class=\"selectpicker workflowSelect\" data-live-search=\"true\" id=\"workflowSelect\">" + //data-none-selected-text
                "<option data-tokens=\"none\" value=\"\">none</option>";
            var numworkflows = accessWorkflows.numChildren();
            var countworkflows = 0;
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
                    countworkflows++;
                    //console.log(createselect, numworkflows, countworkflows);
                    if (createselect && numworkflows == countworkflows) {
                        //console.log("create workflowselect");
                        workflowSelectString = workflowSelectString + "</select>";
                        $('#workflowSelectCollapse').append(workflowSelectString);
                        $('#workflowSelect').selectpicker();
                        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
                            $('#workflowSelect').selectpicker('mobile');
                        }
                        $('.selectpicker').selectpicker();
                        //console.log("workflow select: " + window.workflow);
                        if (window.workflow !== "" && window.workflow !== undefined && window.workflow !== null) {
                            //console.log(window.workflow);
                            $('.workflowSelect').val(window.workflow);
                            $('.selectpicker').selectpicker('refresh');
                        } else {
                            //console.log("update workflow");
                            $('.workflowSelect').val(1);
                            $('.workflowSelect').selectpicker('refresh');
                        }
                        $('.workflowSelect').on("changed.bs.select", function (elem) {
                            // on select update workflowSelect variable
                            //console.log($(this));
                            //console.log("changed value");
                            window.workflow = elem.target.value;
                            //console.log("selected " + window.workflow);
                            $('#workflowwarningmessage').addClass("collapse");
                        });
                        $("#workflowSelectCollapse").removeClass("collapse");
                        $('#workflowwarningmessagecollapse').removeClass("collapse");
                    }
                }).catch(function (err) {
                    //do not have pemission to access workflows
                    createselect = false;
                });
            });
        }).catch(function (error) {
            createselect = false;
            /*
            handleError({
                code: "auth/cannot-get-workflows",
                message: "Workflows invalid. Try deleting your workflows."
            });
            */
        });
    } else {
        $("#workflowselectlabel").remove();
        $("#workflowSelectCollapse").append("<p id=\"noworkflowlabel\">No Workflow</p>");
        $("#workflowSelectCollapse").removeClass("collapse");
    }
}

function getFormData() {
    //console.log(window.urlMode, formId);
    firebase.database().ref('forms/' + window.formId).once('value').then(function (form) {
        //var formKey = form.key;
        //console.log(formKey);
        formData = form.val();
        //console.log(formData);
        //var time = formData.time;
        //console.log("time: " + time);
        //console.log(formData.form);
        window.formArray = JSON.parse(formData.form);
        window.formSharing = formData.sharing
        window.name = formData.name;
        window.workflow = formData.workflow;
        //var formArrayString = JSON.stringify(formArray);
        //console.log("form: " + formArrayString);
    }).then(function () {
        if (window.formSharing == "public") {
            //console.log("view access!");
            renderForm();
        } else {
            //console.log("checking view access");
            checkViewAccess();
        }
    });
}

var createdFileSelect = false;

function getResponseData() {
    //console.log(window.urlMode, window.access, window.formId, window.responseId);
    if (window.urlMode == "response" && (window.access == "edit" || window.access == "view")) {
        $("#submitForm").addClass("collapse");
        firebase.database().ref('responses/' + window.formId + '/' + window.responseId + '/data').once('value').then(function (datalist) {
            datalist.forEach(function (response) {
                var item = response.val();
                var key = response.key;
                //console.log(key);
                //console.log(item.name);
                var name = item.name;
                if (name.includes('[]')) {
                    name = name.replace('[]', '\\[\\]');
                }
                //console.log(name);
                var value = item.value;
                //console.log(value);
                var type = $('textarea[name=' + name + ']').prop("type");
                //console.log(type);
                if (value !== undefined && value !== null && value !== "") {
                    if (type !== undefined) {
                        $('textarea[name=' + name + "]").val(value);
                    } else {
                        type = $('input[name=' + name + ']').prop("type");
                        if (type == undefined) {
                            //console.log("type undefined");
                            //select field
                            $('option[value=' + value + "][id^=" + name).prop('selected', true);
                            //text field:
                            $('#' + name).val(value);
                        } else {
                            //console.log(type);
                            if (type == "date") {
                                $('input[name=' + name + "]").val(value);
                            } else if (type == "checkbox" || type == "radio") {
                                $('input[name=' + name + "][value=" + value).prop('checked', true);
                            } else {
                                $('input[name=' + name + ']').val(value);
                                //console.log(name);
                                if (!(name.includes("autocomplete"))) {
                                    $('input[name=' + name + ']').val(value);
                                } else {
                                    //autocomplete
                                    var autocomplete = $('#' + name + '-input');
                                    if (autocomplete.length) {
                                        //console.log("autocomplete found");
                                        var listselect = $('#' + name + '-list');
                                        //console.log(listselect);
                                        var optionselected = listselect.find('li[value=' + value + ']');
                                        //console.log(optionselected);
                                        if (optionselected.length) {
                                            value = optionselected.text()
                                        }
                                        //console.log(value);
                                        autocomplete.val(value);
                                    }
                                }
                            }
                        }
                    }
                }
                $('#main-form :input').prop('disabled', true);
            });
        }).catch(function (error) {
            handleError(error);
            //window.location.href = "data.html";
        });
        firebase.database().ref('responses/' + window.formId + '/' + window.responseId).once('value').catch(function (error) {
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
            var currentWorkflowUsers = responseData.currentWorkflow.split(',').map(function (item) {
                return item.trim();
            });
            var comment = responseData.comment;
            var commentstring = "";
            if (comment !== undefined && comment !== "" && comment !== null) {
                commentstring = ", comment: " + comment;
                //console.log(commentstring);
            }
            var rejectedBy = responseData.rejectedBy;
            var rejectedByString = "";
            if (rejectedBy !== undefined && rejectedBy !== "" && rejectedBy !== null) {
                rejectedByString = ", rejected by: " + rejectedBy;
            }
            try {
                var utctime = new Date(responseData.time);
                var time = utctime.toString();
            } catch (err) {
                //console.log("undefined error: " + err);
            }
            //console.log("time: " + time);

            var workflowString = "start";
            var workflowData = responseData.workflowChain;
            if (workflowData !== undefined) {
                for (var i = 0; i < workflowData.length; i++) {
                    var emailDatapoint = workflowData[i].value;
                    //console.log(emailDatapoint);
                    workflowString = workflowString + " => " + emailDatapoint;
                }
                workflowString = workflowString + " => end"

                var approvestring = "";

                if (status == "pending") {
                    var indexOfUser = currentWorkflowUsers.indexOf(window.email);
                    if (indexOfUser !== -1) {
                        approvestring = "<button value=\"" + window.formId + ',' + window.responseId + "\" class=\"approveResponse " +
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

                //console.log("added approve data");
                $('.approveResponse').remove();
                $('.rejectResponse').remove();
                $('#acceptrejectbuttons').append(approvestring);
                $("#acceptrejectCollapse").removeClass("collapse");
            }

            try {
                window.filenamedata = responseData.files.filenames;
                if (!(createdFileSelect) && window.filenamedata !== null && window.filenamedata !== undefined && window.filenamedata[0] !== "nofiles") {
                    createdFileSelect = true;
                    //console.log("file name data: ");
                    //console.log(window.filenamedata);
                    window.fileiddata = responseData.files.fileids;
                    //console.log("file id data: ");
                    //console.log(window.fileiddata);
                    $("#fileSelect").remove();
                    var fileSelectString = "<select class=\"selectpicker fileSelect\" data-live-search=\"true\" id=\"fileSelect\" multiple>";
                    for (var i = 0; i < window.filenamedata.length; i++) {
                        fileSelectString = fileSelectString + "<option data-tokens=\"" + window.filenamedata[i] + "\" value=\"" + window.fileiddata[i] + "\">" + window.filenamedata[i] + "</option>";
                    }
                    fileSelectString = fileSelectString + "</select><br/><br/><br/><br/>";
                    $('#fileselectpickerdiv').append(fileSelectString);
                    $('#fileSelect').selectpicker();
                    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
                        $('#fileSelect').selectpicker('mobile');
                    }
                    $('.selectpicker').selectpicker();
                    $('#fileSelect').on("change", function () {
                        window.filesselected = []
                        window.filesselected = $(this).val();
                        //console.log("selected " + window.filesselected);
                        var numSelectedFiles = window.filesselected.length;
                        //console.log(numSelectedFiles);
                        if (numSelectedFiles !== 0) {
                            $("#downloadFile").removeClass("collapse");
                        } else {
                            $("#downloadFile").addClass("collapse");
                        }
                    });
                    $("#fileSelectCollapse").removeClass("collapse");
                } else {
                    //console.log("no data found");
                }
            } catch (err) {
                //console.log("no files");
            }
        });
    } else if (window.urlMode == "view") {
        //user can submit form
        //console.log("submit access");
        $("#submitForm").removeClass("collapse");
    }
}

$(document).on('click touchstart', "#downloadFile", function () {

    $('#toslink').attr('href', config.other.tosUrl);
    $('#privacypolicylink').attr('href', config.other.privacyPolicyUrl);

    var urlArray = [];
    var counturl = 0;
    for (var j = 0; j < window.filesselected.length; j++) {
        firebase.storage().ref('files/' + window.filesselected[j]).getDownloadURL().then(function (url) {
            counturl++;
            //console.log("url: " + url);
            urlArray.push(url);
            if (counturl == window.filesselected.length) {
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
                                var filename = window.filenamedata[count];
                                //console.log(filename, window.filenamedata);
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
                    var filename = window.filenamedata[0];
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
            }
            //console.log(newStatus);
            firebase.database().ref('responses/' + formKey + '/' + responseKey).update({
                status: newStatus,
                comment: window.comment,
                currentWorkflow: nextWorkflow,
                notificationstatus: notificationstatusstring
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
                            });
                        }
                        if (i == nextapprovallen - 1 && newStatus == "pending") {
                            //console.log("sending approval email notification");
                            var sendEmails = firebase.functions().httpsCallable('sendApprovalEmailNotification');
                            sendEmails({
                                responseId: responseKey,
                                formId: formKey
                            }).then(function (result) {
                                // Read result of the Cloud Function.
                                //console.log(result);
                                var statusMessage = result.data.status;
                                //console.log(statusMessage);
                                //console.log("form approval sent to next party");
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
            //console.log("rejected the submission");
            //console.log("sending rejected email notification");
            var sendEmails = firebase.functions().httpsCallable('sendApprovedRejectedEmailNotification');
            sendEmails({
                responseId: responseKey,
                formId: formKey
            }).then(function (result) {
                // Read result of the Cloud Function.
                //console.log(result);
                var statusMessage = result.data.status;
                //console.log(statusMessage);
                //console.log("form rejected notification sent");
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

$.validator.addMethod(
    'filesize',
    function (value, element, filesizeparam) {
        var totalsize = 0;
        for (var i = 0; i < element.files.length; i++) {
            totalsize = totalsize + element.files[i].size;
        }
        var filesizeunits = config.other.filesizeunits.toUpperCase();
        if (filesizeunits == 'KB' || filesizeunits == 'KILOBYTES') {
            var totalsize = Math.floor(totalsize / 1000);
        } else if (filesizeunits == 'MB' || filesizeunits == 'MEGABYTES') {
            var totalsize = Math.floor(totalsize / 1000000);
        } else if (filesizeunits == 'GB' || filesizeunits == 'GIGABYTES') {
            var totalsize = Math.floor(totalsize / 1000000000);
        }
        return this.optional(element) || (totalsize <= filesizeparam);
    },
    ""
);

function createWorkflowLabel() {
    firebase.database().ref('workflows/' + window.workflow).once('value').then(function (workflow) {
        var workflowval = workflow.val();
        //console.log(workflowval);
        try {
            var flowName = workflowval.name;
            //console.log(flowName);
            //show the workflow name
            $("#workflowName").text(flowName);
            $("#workflowNameCollapse").removeClass("collapse");
        } catch (err) {
            //workflow was deleted!
            createworkflowSelect();
        }
    }).catch(function (error) {
        //handleError(error);
        //do not have access to the workflow data
    });
}

function renderForm() {
    var options = {
        dataType: 'json',
        formData: window.formArray
    };
    var renderedForm = $('#main-form');
    $("#main-form").removeClass("collapse");
    renderedForm.formRender(options);
    $("#form-title").text(window.name);
    if (window.urlMode == "response") {
        var gotdata = false;
        firebase.database().ref('responses/' + window.formId + '/' + window.responseId).once('value').then(function (responsedata) {
            var responsedataVal = responsedata.val();
            window.workflow = responsedataVal.workflow;
            if (window.workflow !== "") {
                gotdata = true;
                //console.log(window.workflow);
                createWorkflowLabel();
            }
        });
        setTimeout(function () {
            if (!(gotdata)) {
                //console.log("create workflow select");
                createworkflowSelect();
            }
        }, config.other.datatimeout);
    } else if (window.workflow == "") {
        //create the workflow-select dropdown
        createworkflowSelect();
    } else {
        createWorkflowLabel();
    }
    //console.log(renderedForm.html());

    $('#main-form > div > div').children().each(function () {
        //console.log($(this));
        var type = $(this).prop("type");
        if (type !== undefined) {
            //console.log(type);
        }
        if (type == "file") {
            var unitstring = "";
            var unittype = config.other.filesizeunits.toUpperCase();
            if (unittype == "BYTES" || unittype == "BYTE" || unittype == "B") {
                unitstring = " bytes";
            } else if (unittype == "KILOBYTES" || unittype == "KILOBYTE" || unittype == "KB") {
                unitstring = "KB";
            } else if (unittype == "MEGABYTES" || unittype == "MEGABYTE" || unittype == "MB") {
                unitstring = "MB";
            } else if (unittype == "GIGABYTES" || unittype == "GIGABYTE" || unittype == "GB") {
                unitstring = "MB";
            }
            $(this).rules("add", {
                filesize: config.other.maxfilesize,
                messages: {
                    filesize: "Please select files less than " + config.other.maxfilesize + unitstring + " total."
                }
            });
        }
    });

    $('#main-form > div > div').find("[aria-required='true']").each(function (required) {
        //console.log($(this));
        /*
        if (required !== undefined) {
            //console.log("required");
        }
        */
        var type = $(this).prop("type");
        if (type !== undefined) {
            //console.log(type);
            $(this).rules("add", {
                required: true,
                messages: {
                    required: "Please fill out the " + type
                }
            });
        }
    });
    getResponseData();
    checkEditAccess();
}

function checkResponseAccess() {
    firebase.database().ref('responses/' + window.formId + '/' + window.responseId).once('value').catch(function (error) {
        handleError(error);
    }).then(function (response) {
        var responseKey = response.key;
        //console.log(responseKey);
        var responseData = response.val();
        //console.log(responseData);
        var userIdSubmit = responseData.userId;
        //console.log(userIdSubmit);
        var permitted = false;
        //console.log(userIdSubmit);
        if (userIdSubmit == window.userId) {
            permitted = true;
        } else {
            var workflowData = responseData.workflowChain;
            for (var i = 0; i < workflowData.length; i++) {
                var emailDatapoint = workflowData.value;
                //console.log(emailDatapoint);
                var emailDatapointArray = emailDatapoint.split(',').map(function (item) {
                    return item.trim();
                });
                //console.log(emailDatapointArray);
                //console.log(window.email);
                //console.log(window.email.replace("\"", ''));
                if (emailDatapointArray.indexOf(window.email) !== -1) {
                    permitted = true;
                }
            }
        }
        if (!(permitted)) {
            handleError({
                code: "auth/no-view-access",
                message: "You do not have permission to view this form."
            });
        } else {
            if (window.access == undefined || window.access == null || window.access == "") {
                window.access = "view";
            }
            //console.log(window.access);
            renderForm();
        }
    });
}


function checkViewAccess() {
    firebase.database().ref('access/forms/formsbyuser/' + window.userId + '/' + window.formId).once('value').then(function (accessForm) {
        var accessData = accessForm.val();
        //console.log(accessData);
        try {
            window.access = accessData.access;
            //console.log("access: " + window.access);
        } catch (err) {
            //console.log("no view access found");
            if (window.formSharing == "public") {
                window.access = "view";
            } else {
                window.access = "no access";
            }
        }
    }).then(function () {
        //console.log(window.access);
        if (window.access == "edit" || window.access == "view") {
            if (window.urlMode == "response") {
                //console.log("check response access");
                checkResponseAccess();
            } else {
                renderForm();
            }
        } else {
            if (window.urlMode == "response") {
                //console.log("check response access");
                checkResponseAccess();
            } else {
                //console.log("no view access: " + error);
                handleError({
                    code: "auth/no-view-access",
                    message: "You do not have permission to view this form."
                });
                setTimeout(function () {
                    window.location.href = 'user.html';
                }, config.other.redirecttimeout);
            }
        }
    }).catch(function (error) {
        //console.log("no view access: " + error);
        handleError({
            code: "auth/no-view-access",
            message: "You do not have permission to view this form."
        });
        setTimeout(function () {
            window.location.href = 'user.html';
        }, config.other.redirecttimeout);
    });
}


function checkEditAccess() {
    if (window.access === "edit") {
        //console.log("edit access!");
        $("#edit-access-buttons").removeClass("collapse");
        $("#editForm").on('click touchstart', function () {
            window.location.href = 'edit.html?mode=edit&formid=' + window.formId;
        });
        $("#formData").on('click touchstart', function () {
            window.location.href = 'data.html?mode=data&formid=' + window.formId;
        });
    } else {
        //console.log("no edit access");
    }
}

function createForm() {
    $script.get('https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js', function () {
        require("formBuilder/dist/form-builder.min.js");
        require("formBuilder/dist/form-render.min.js");
        var user = firebase.auth().currentUser;
        if (user) {
            window.createselectpicker = true;
            window.email = user.email;
            var testemail = new RegExp(config.regex.companyemailregex, 'g');
            if (testemail.test(window.email)) {
                $("#headeralternate").addClass("collapse");
                $("#headermain").removeClass("collapse");
            } else {
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
            window.userId = user.uid;
            window.urlMode = $.urlParam('mode');
            window.formId = $.urlParam('formid');
            if (window.urlMode == "view") {
                window.formId = $.urlParam('formid');
                //console.log(window.urlMode, window.formId);
                if (window.formId == "") {
                    handleError({
                        code: "auth/invalid-form-id",
                        message: "Invalid form id."
                    });
                } else {
                    //console.log("get form data");
                    getFormData();
                }
            } else if (window.urlMode == "response") {
                window.createselectpicker = false;
                window.responseId = $.urlParam('responseid');
                if (window.responseId == "") {
                    handleError({
                        code: "auth/invalid-response-id",
                        message: "Invalid response id."
                    });
                } else if (window.formId == "") {
                    handleError({
                        code: "auth/invalid-form-id",
                        message: "Invalid form id."
                    });
                } else {
                    //console.log("get form data");
                    getFormData();
                }
            } else {
                handleError({
                    code: "auth/invalid-mode",
                    message: "Invalid form mode."
                });
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

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/*
function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}
*/

$(document).ready(function () {

    function submitForm() {
        if ($("#main-form").valid()) {
            //console.log("valid input");
            var formData = $("#main-form").serializeArray();
            var datedata = new Date();
            var timestamp = datedata.getTime();
            var workflowChain = [];
            var firstapproval = "";
            var workflowid = "";
            var filesuploadedids = [];
            var filesuploadednames = [];
            var inputids = [];
            var updatedResponse = false;

            function updateResponseSubmission() {
                if (!(updatedResponse)) {
                    updatedResponse = true;
                    //console.log("files:");
                    //console.log(filesuploadedids, filesuploadednames);
                    firebase.database().ref('responses/' + window.formId + '/' + window.responseId).update({
                        data: formData,
                        time: timestamp,
                        userId: window.userId,
                        workflowChain: workflowChain,
                        currentWorkflow: firstapproval,
                        workflow: workflowid,
                        status: "pending",
                        notificationstatus: "pending"
                    }).then(function () {
                        firebase.database().ref('responses/' + window.formId + '/' + window.responseId + '/files/').update({
                            fileids: filesuploadedids,
                            filenames: filesuploadednames,
                            inputs: inputids
                        }).then(function () {
                            firebase.database().ref('users/' + window.userId + '/responses/' + window.formId + '/' + window.responseId).set({
                                status: "pending",
                                time: timestamp
                            }).then(function () {
                                if (workflowid !== "") {
                                    //console.log("sending submission email notification");
                                    var sendEmails = firebase.functions().httpsCallable('sendApprovalEmailNotification');
                                    sendEmails({
                                        responseId: window.responseId,
                                        formId: window.formId
                                    }).then(function (result) {
                                        // Read result of the Cloud Function.
                                        //console.log(result);
                                        var statusMessage = result.data.status;
                                        //console.log(statusMessage);
                                    }).catch(function (error) {
                                        // Getting the Error details.
                                        //console.log(error);
                                        handleError(error);
                                    });
                                }
                                //console.log("form submitted");
                                $('#alertsubmitsuccess').fadeIn();
                                setTimeout(function () {
                                    $('#alertsubmitsuccess').fadeOut();
                                    $('#view-response-button').removeClass("collapse");
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
                } else {
                    //console.log("already submitted");
                }
            }

            function getFiles() {
                //console.log("submit files");
                var numChildren = $('#main-form > div > div').children().length;
                var countiterations = 0;
                var numFileInput = 0;
                var numFileUpload = 0;

                $('#main-form > div > div').children().each(function () {
                    countiterations++;
                    //console.log($(this));
                    var type = $(this).prop("type");
                    if (type !== undefined) {
                        //console.log(type);
                    }
                    if (type == "file") {
                        var elemid = $(this).attr('id');
                        //console.log(elemid);
                        var docelem = document.getElementById(elemid);
                        //console.log(docelem);
                        var numfiles = docelem.files.length;
                        //console.log(numfiles);
                        if (numfiles == 0) {
                            inputids.push(elemid);
                            //console.log(inputids);
                            filesuploadednames.push("nofiles");
                            filesuploadedids.push("nofiles");
                            //console.log("no files in input");
                            if (countiterations == numChildren) {
                                updateResponseSubmission();
                            }
                        }
                        for (var i = 0; i < numfiles; i++) {
                            inputids.push(elemid);
                            //console.log(inputids);
                            numFileInput++;
                            continuesubmit = false;
                            var file = docelem.files[i];
                            var filename = file.name;
                            //console.log("name: " + filename);
                            filesuploadednames.push(filename);
                            var uniqueid = uuidv4();
                            //console.log(uniqueid);
                            filesuploadedids.push(uniqueid);
                            var storageRef = firebase.storage().ref('files/' + uniqueid);
                            storageRef.put(file).catch(function (err) {
                                //console.log("file upload error");
                                handleError(err);
                            }).then(function () {
                                numFileUpload++;
                                //console.log(filesuploadedids, filesuploadednames);
                                if (filename == docelem.files[numfiles - 1].name) {
                                    if (countiterations == numChildren) {
                                        updateResponseSubmission();
                                    }
                                }
                            });
                        }
                    }
                    //console.log(countiterations, numChildren);

                    if (countiterations == numChildren) {
                        //console.log("iterated throguh all children");
                        var updatedSubmission = false;

                        function delayUntilReady() {
                            setTimeout(function () {
                                if (!(updatedSubmission)) {
                                    if (numFileUpload == numFileInput) {
                                        updateResponseSubmission();
                                        updatedSubmission = true;
                                    } else {
                                        updatedSubmission = false;
                                        delayUntilReady();
                                    }
                                } else {
                                    //console.log("gone into the submission stage");
                                    return;
                                }
                            }, 20);
                        }
                        delayUntilReady();
                    }
                });
            }

            window.responseId = firebase.database().ref().child('responses/' + window.formId).push().key;
            if (window.workflow !== "") {
                //console.log("submitted with workflow " + window.workflow);
                firebase.database().ref('workflows/' + window.workflow).once('value').then(function (workflowData) {
                    workflowid = workflowData.key;
                    //console.log(workflowid);
                    var workflowVal = workflowData.val();
                    //console.log(workflowVal);
                    workflowChain = workflowVal.workflow;
                    //console.log(workflowChain);
                    firstapproval = workflowChain[0].value;
                    var firstapprovalarray = firstapproval.split(',').map(function (item) {
                        return item.trim();
                    });
                    for (var i = 0; i < firstapprovalarray.length; i++) {
                        var cleanemail = firstapprovalarray[i].replace(/\./g, ',');
                        if (cleanemail !== "" && cleanemail !== null && cleanemail !== undefined) {
                            firebase.database().ref('access/approval/' + cleanemail + '/' + window.responseId).set({
                                formId: window.formId
                            }).then(function () {
                                //console.log("added approval status to first approval");
                            }).catch(function (err) {
                                handleError(err);
                            });
                        }
                    }
                    getFiles();
                }).catch(function (error) {
                    //handleError(error);
                    //don't have access to the data
                });
            } else {
                getFiles();
            }
        } else {
            handleError({
                code: "auth/invalid-form-id",
                message: "Please fill in all required fields."
            })
        }
    }

    $("#main-form").validate({
        submitHandler: submitForm,
        errorElement: "div",
        errorPlacement: function (error, element) {
            // Add the `invalid-feedback` class to the div element
            error.addClass("invalid-feedback");
            //error.insertAfter(element);
            if (element.prop("type") === "checkbox" || element.prop("type") === "radio") {
                error.insertAfter(element.parent("div").parent("div"));
            } else {
                error.insertAfter(element);
            }
        },
        highlight: function (element) {
            $(element).addClass("is-invalid").removeClass("is-valid");
        },
        unhighlight: function (element) {
            $(element).addClass("is-valid").removeClass("is-invalid");
        }
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
            createForm();
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

    $("#submitForm").on('click touchstart', function () {
        //validate form
        //console.log("submit form");
        submitForm();
    });

    $("#viewResponse").on('click touchstart', function () {
        //go to responses
        window.location.href = "responses.html";
    });
});