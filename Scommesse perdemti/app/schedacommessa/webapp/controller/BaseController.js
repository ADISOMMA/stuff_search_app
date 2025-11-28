sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/m/MessagePopover',
    'sap/m/MessageItem',
    'sap/ui/core/message/Message',
    'sap/ui/core/Core',
    'sap/ui/core/library',
], function (Controller, MessagePopover, MessageItem, Message, Core, coreLibrary,) {
    "use strict";
    var MessageType = coreLibrary.MessageType;
    var INACTIVITY_TIMEOUT = 300000; // 5 minutes
    var KEEP_ALIVE_INTERVAL = 120000; // 2 minutes
    var KEEP_ALIVE_THRESHOLD = 240000; // 4 minutes

    return Controller.extend("schedacommessa.controller.BaseController", {
        onInit: async function () {
            globalThis.that = this;


        },
        // TIMER INACTIVITY
        resetInactivityTimer: function (internalCall) {
            if (internalCall !== true) {
                this._inactivityWarningShown = false;
            }
            this._lastActivityTimestamp = Date.now();

            if (this._inactivityTimer) {
                clearTimeout(this._inactivityTimer);
            }

            this._inactivityTimer = setTimeout(this.showDisconnectMessage.bind(this), INACTIVITY_TIMEOUT);

            if (!this._keepAliveTimer) {
                this._keepAliveTimer = setInterval(this._keepSessionAlive.bind(this), KEEP_ALIVE_INTERVAL);
            }
        },

        showDisconnectMessage: function () {
            if (this._inactivityWarningShown) {
                return;
            }

            if (this._inactivityTimer) {
                clearTimeout(this._inactivityTimer);
                this._inactivityTimer = null;
            }
            this._inactivityWarningShown = true;

            sap.m.MessageBox.warning("You will be disconnected due to inactivity.", {
                actions: [sap.m.MessageBox.Action.OK],
                onClose: function () {
                    this.resetInactivityTimer(true);
                }.bind(this)
            });
        },

        _keepSessionAlive: function () {
            if (!this._lastActivityTimestamp) {
                return;
            }

            var now = Date.now();
            var timeSinceLastActivity = now - this._lastActivityTimestamp;

            if (timeSinceLastActivity >= KEEP_ALIVE_THRESHOLD) {
                return;
            }

            if (window.fetch) {
                var keepAliveUrl = window.location.pathname || "/";
                fetch(keepAliveUrl, {
                    method: "HEAD",
                    cache: "no-store",
                    credentials: "same-origin"
                }).catch(function () {
                    return;
                });
            }

        },

        onExit: function () {
            if (this._keepAliveTimer) {
                clearInterval(this._keepAliveTimer);
                this._keepAliveTimer = null;
            }
            if (this._inactivityTimer) {
                clearTimeout(this._inactivityTimer);
                this._inactivityTimer = null;
            }
        },

        onExit: function () {
            if (this._keepAliveTimer) {
                clearInterval(this._keepAliveTimer);
                this._keepAliveTimer = null;
            }
            if (this._inactivityTimer) {
                clearTimeout(this._inactivityTimer);
                this._inactivityTimer = null;
            }
        },

        //
        //
        //Metodi di supporto
        //
        //
        setFilterOr(valori, nomeCampoStr, nomeCampoFlr, condizione, ExcludeLast) {
            let k = 0;
            if (ExcludeLast) { k = 1 }
            if (Array.isArray(valori) === true && valori.length > 0) {

                var filter = '(';
                filter += ` ${nomeCampoFlr} ${condizione} '${valori[0][`${nomeCampoStr}`]}' `;

                for (let i = 1; i < valori.length - k; i++) {

                    filter += ` or ${nomeCampoFlr} ${condizione} '${valori[i][`${nomeCampoStr}`]}' `;

                }

                filter += ")";

                return filter;
            }
            else {
                return '';
            }
        },
        removeDuplicateBy: function (data, key, value) {
            return [... new Map(
                data.map(x => [key(x), value(x)])
            ).values()];
        },
        moveCorresponding: function (obj1, obj2) {
            for (const property in obj1) {
                if (obj2[property]) {
                    obj2[property] = obj1[property];
                }
            }
        },
        setSimpleFormEditability(elements, start, end) {
            let i = 0, j = 666;
            if (start) { i = start }
            if (end >= 0) { j = end }
            elements.forEach((cell, ind) => {
                if (cell.getId().indexOf('input') > 0) {
                    if (ind >= i && ind <= j) {
                        cell.setEditable(true)
                    } else {
                        cell.setEditable(false)
                    }
                } else {
                    i++;
                    j++
                }
            })
        },
        setMRawUneditable(tableId, index, start, end) {
            try {
                var LastRawCells, i = -1, j = -1;
                var oTable = this.getView().byId(tableId);
                if (!isNaN(index)) {
                    LastRawCells = oTable.getItems()[index].getCells()
                } else {
                    let rows = oTable.getItems();
                    if (rows && rows.length > 0)
                        LastRawCells = rows[rows.length - 1].getCells();
                }
                if (start) { i = start - 1 }
                if (end) { j = end }
                LastRawCells.forEach((cell, ind) => {
                    if (cell.getId().indexOf('input') > 0) {
                        if (end) {
                            if (ind > i && ind < j) {
                                cell.setEditable(false)
                            }
                        }
                        else if (ind > i) {
                            cell.setEditable(false)
                        }
                    } else {
                        i++;
                        j++
                    }
                })

            } catch (error) {
                this.handleCatch(error, 'setRawUneditable')
            }

        },
        setRawUneditable(tableId, index, start, end) {
            try {
                //
                var LastRawCells, i = -1, j = -1;
                var oTable = this.getView().byId(tableId);
                if (!isNaN(index)) {
                    LastRawCells = oTable.getRows()[index].getCells()
                } else {
                    let rows = oTable.getRows();
                    if (rows && rows.length > 0)
                        LastRawCells = rows[rows.length - 1].getCells();
                }
                if (start) { i = start - 1 }
                if (end) { j = end }
                LastRawCells.forEach((cell, ind) => {
                    if (cell.getId().indexOf('input') > 0) {
                        if (end) {
                            if (ind > i && ind < j) {
                                cell.setEditable(false)
                            }
                        }
                        else if (ind > i) {
                            cell.setEditable(false)
                        }
                    } else {
                        i++;
                        j++
                    }
                })

            } catch (error) {
                this.handleCatch(error, 'setRawUneditable')
            }

        },
        setRawUnenable(tableId, index, start, end) {
            try {
                //this.setEditableTable(tableId);
                var LastRawCells, i = 0, j = 0;
                var oTable = this.getView().byId(tableId);
                if (index || index === 0) {
                    LastRawCells = oTable.getItems()[index].getCells()
                } else {
                    let rows = oTable.getItems();
                    if (rows && rows.length > 0)
                        LastRawCells = rows[rows.length - 1].getCells();
                }
                if (start) { i = start }
                LastRawCells.forEach((cell) => {
                    if (cell.getId().indexOf('button') > 0) {
                        if (end) {
                            if (i < j && end > j) {
                                cell.setEnabled(false)
                            }
                        }
                        else if (i < j) {
                            cell.setEnabled(false)
                        }
                    }
                    j++;
                })

            } catch (error) {
                this.handleCatch(error, 'setRawUnenable')
            }

        },
        setLastColumnUnenable(idTable) {

            var oTable = this.getView().byId(idTable);
            var RawCells = oTable.getItems();

            RawCells.forEach((raw) => {
                let cells = raw.getCells();
                cells[cells.length - 1].setEnabled(false);

            })
        },
        setLastRowElementUnenable(idTable, index) {
            var oTable = this.getView().byId(idTable);
            var cells = oTable.getItems()[index].getCells();
            cells[cells.length - 1].setEnabled(false);

        },
        setLastRowElementEnable(idTable, index) {
            var oTable = this.getView().byId(idTable);
            var cells = oTable.getItems()[index].getCells();
            cells[cells.length - 1].setEnabled(true);
        },
        setEditableTable(tableId) {
            let rows = this.getView().byId(tableId).getRows();
            if (rows && rows.length > 0) {
                rows.forEach((row) => {
                    let LastRawCells = row.getCells();
                    LastRawCells.forEach((cell) => {
                        if (cell.getId().indexOf('input') > 0) {
                            cell.setEditable(true);
                        }
                    })
                })
            }
        },

        setRawEditable(tableId, index, start, end) {
            try {
                var LastRawCells, i = 0, j = 0;
                if (index) {
                    LastRawCells = this.getView().byId(tableId).getRows()[index].getCells()
                } else {
                    let rows = this.getView().byId(tableId).getRows();
                    LastRawCells = rows[rows.length - 1].getCells();
                }

                if (start) { i = start }

                LastRawCells.forEach((cell) => {

                    if (cell.getId().indexOf('input') > 0) {
                        if (end) {
                            if (i < j && end > j) {
                                cell.setEditable(true)
                            }
                        }
                        else if (i < j) {
                            cell.setEditable(true)
                        }
                    }
                    j++;
                })
            } catch (error) {
                this.handleCatch(error, 'setRawUneditable')
            }
        },
        //
        //
        //Gestione Eccezioni
        //
        //
        handleCatch(e, Text) {
            let value = {};
            if (e.message) {
                value = {
                    additionalText: Text,
                    message: e.message,
                    description: e.stack
                }

            } else if (e.responseJSON) {
                value = {
                    additionalText: Text,
                    message: e.responseJSON.error.message,
                    description: e.responseJSON.error.message.code
                }
            } else if (e.statusText) {
                value = {
                    additionalText: Text,
                    message: e.responseText,
                    description: e.statusText
                }
            }
            this.setMessage(value);
            this.formatButton();

        },
        //
        //
        //Gestione PopoverMessage
        //
        //

        initPopoverMessage() {
            this.oView = this.getView();
            this._MessageManager = Core.getMessageManager();
            // Clear the old messages
            this._MessageManager.removeAllMessages();

            this.oView.setModel(this._MessageManager.getMessageModel(), "message");
            this.createMessagePopover();
        },
        removeAllMessages() {
            this._MessageManager.removeAllMessages();
        },
        setMessageSucces(value) {
            this._MessageManager.addMessages(
                new Message({
                    type: MessageType.Success,
                    description: value.description,
                    message: value.message,
                    additionalText: value.additionalText,
                    activeTitle: true
                })
            );

        },
        setMessage(value) {
            var msg = new Message({
                type: value.type || MessageType.Error,
                description: value.description,
                message: value.message,
                additionalText: value.additionalText,
                activeTitle: true
            });
            this._MessageManager.addMessages(msg);
            return msg;
        },

        formatButton() {
            var oButton = this.getView().byId("messagePopoverBtn");

            oButton.setText(this.highestSeverityMessages());

            oButton.setType(this.buttonTypeFormatter());

            oButton.setIcon(this.buttonIconFormatter());
        },
        setMessagePOST(sArrayData, dataResult) {

            //this._MessageManager.removeAllMessages();

            var retryBatch = [];
            for (var i = 0; i < sArrayData.length; i++) {

                switch (dataResult[i]) {
                    case 'setStaffing':

                        break;
                    case 'StaffDitr':

                        break;
                    default:
                        break;
                }
                if (!dataResult[i]) {

                    this._MessageManager.addMessages(
                        new Message({
                            type: value.type || MessageType.Error,
                            description: JSON.stringify(sArrayData[i].data),
                            message: 'Not Executed',
                            additionalText: 'additional',
                            activeTitle: true
                        })
                    );
                    retryBatch.push(sArrayData[i]);
                }
                else {
                    if (dataResult[i].responseType.includes("201")) {
                        this._MessageManager.addMessages(
                            new Message({
                                type: MessageType.Success,
                                description: dataResult[i].location,
                                message: dataResult[i].location,
                                additionalText: dataResult[i].location,
                                activeTitle: true
                            })
                        );
                    }
                    else {
                        this._MessageManager.addMessages(
                            new Message({
                                type: value.type || MessageType.Error,
                                description: dataResult[i].responseText,
                                message: dataResult[i].responseType,
                                additionalText: '',
                                activeTitle: true
                            })
                        );
                    }
                }
            }
            this.formatButton();

        },
        handleMessagePopoverPress: function (oEvent) {
            if (!this.oMP) {
                this.createMessagePopover();
            }
            this.oMP.toggle(oEvent.getSource());
        },
        createMessagePopover: function () {

            this.oMP = new MessagePopover({
                /*
                //Ti porta al campo errato
                //
         
                activeTitlePress: function (oEvent) {
                    var oItem = oEvent.getParameter("item"),
                        oPage = that.getView().byId("messageHandlingPage"),
                        oMessage = oItem.getBindingContext("message").getObject(),
                        oControl = Element.registry.get(oMessage.getControlId());
         
                    if (oControl) {
                        oPage.scrollToElement(oControl.getDomRef(), 200, [0, -100]);
                        setTimeout(function(){
                            var bIsBehindOtherElement = isBehindOtherElement(oControl.getDomRef());
                            if (bIsBehindOtherElement) {
                                this.close();<
                            }
                            if (oControl.isFocusable()) {
                                oControl.focus();
                            }>
                        }.bind(this), 300);
                    }
                },*/
                items: {
                    path: "message>/",
                    template: new MessageItem(
                        {
                            title: "{message>message}",
                            subtitle: "{message>additionalText}",
                            activeTitle: "{message>activeTitle}",
                            type: "{message>type}",
                            description: "{message>description}"
                        })
                },
                groupItems: true
            });

            this.getView().byId("messagePopoverBtn").addDependent(this.oMP);
        },
        // Display the button type according to the message with the highest severity
        // The priority of the message types are as follows: Error > Warning > Success > Info
        buttonTypeFormatter: function () {
            var sHighestSeverity;
            var aMessages = this._MessageManager.getMessageModel().oData;
            aMessages.forEach(function (sMessage) {
                switch (sMessage.type) {
                    case "Error":
                        sHighestSeverity = "Negative";
                        break;
                    case "Warning":
                        sHighestSeverity = sHighestSeverity !== "Negative" ? "Critical" : sHighestSeverity;
                        break;
                    case "Success":
                        sHighestSeverity = sHighestSeverity !== "Negative" && sHighestSeverity !== "Critical" ? "Success" : sHighestSeverity;
                        break;
                    default:
                        sHighestSeverity = !sHighestSeverity ? "Neutral" : sHighestSeverity;
                        break;
                }
            });
            return sHighestSeverity;
        },
        // Display the number of messages with the highest severity
        highestSeverityMessages: function () {
            var sHighestSeverityIconType = this.buttonTypeFormatter();
            var sHighestSeverityMessageType;

            switch (sHighestSeverityIconType) {
                case "Negative":
                    sHighestSeverityMessageType = "Error";
                    break;
                case "Critical":
                    sHighestSeverityMessageType = "Warning";
                    break;
                case "Success":
                    sHighestSeverityMessageType = "Success";
                    break;
                default:
                    sHighestSeverityMessageType = !sHighestSeverityMessageType ? "Information" : sHighestSeverityMessageType;
                    break;
            }

            return this._MessageManager.getMessageModel().oData.reduce(function (iNumberOfMessages, oMessageItem) {
                return oMessageItem.type === sHighestSeverityMessageType ? ++iNumberOfMessages : iNumberOfMessages;
            }, 0) || "1";
        },

        // Set the button icon according to the message with the highest severity
        buttonIconFormatter: function () {
            var sIcon;
            var aMessages = this._MessageManager.getMessageModel().oData;

            aMessages.forEach(function (sMessage) {
                switch (sMessage.type) {
                    case "Error":
                        sIcon = "sap-icon://error";
                        break;
                    case "Warning":
                        sIcon = sIcon !== "sap-icon://error" ? "sap-icon://alert" : sIcon;
                        break;
                    case "Success":
                        sIcon = sIcon !== "sap-icon://error" && sIcon !== "sap-icon://alert" ? "sap-icon://sys-enter-2" : sIcon;
                        break;
                    default:
                        sIcon = !sIcon ? "sap-icon://information" : sIcon;
                        break;
                }
            });

            return sIcon;
        },

        formatBatchRequest2: function (batchData) {

            var myArray = batchData.split("\r\n");
            var arrResturn = [];
            for (let i = 0; i < myArray.length; i++) {
                if (myArray[i] === '--request-separator') {

                    let strReturn = { responseType: "", responseText: "", location: "" };
                    for (; i < myArray.length; i++) {
                        if (myArray[i].includes("HTTP")) {
                            strReturn.responseType = myArray[i];
                            continue;
                        }
                        if (myArray[i].includes("location")) {
                            strReturn.location = myArray[i];
                            continue;
                        }
                        if (myArray[i].includes("{")) {
                            strReturn.responseText = myArray[i]; //JSON.parse(myArray[i]);
                            arrResturn.push(strReturn);
                            break;
                        }
                    }
                }
            }
            return arrResturn;
        },
        //
        //
        //Gestione Batch Request
        //
        //
        batchPostRequest: async function (batchRequests, csrfToken) {
            let that = this;
            // Creare il corpo della richiesta batch
            var batchBoundary = 'request-separator';
            var batchRequestBody = "";

            for (var i = 0; i < batchRequests.length; i++) {
                var request = batchRequests[i];
                batchRequestBody += '--' + batchBoundary + '\r\n';
                batchRequestBody += 'Content-Type: application/http\r\n';
                batchRequestBody += 'Content-Transfer-Encoding: binary\r\n\r\n';
                batchRequestBody += request.method + ' ' + request.requestUri + ' HTTP/1.1\r\n' + request.contentType + '\r\n\r\n' + JSON.stringify(request.data) + '\r\n';
                for (var headerName in request.headers) {
                    batchRequestBody += headerName + ': ' + request.headers[headerName] + '\r\n';
                }
                batchRequestBody += '\r\n';
            }

            // Aggiungi la parte di chiusura del corpo della richiesta batch
            batchRequestBody += '--' + batchBoundary + '--';

            let requestStatus = "success";
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: '/odata/v4/staffinglistservices/$batch',
                    type: 'POST',
                    data: batchRequestBody,
                    contentType: 'multipart/mixed; boundary=' + batchBoundary,
                    headers: { 'x-csrf-token': csrfToken },
                    success: function (data, textStatus) {
                        var res = that.formatBatchRequest2(data);
                        that.onSuccessGet(res, 'BatchResponse', null);
                        resolve(data);
                    },
                    error: function (oError, textStatus) {
                        reject(oError)
                    }
                });
            })

        },
        handleSuccessBatch(batchRequests) {
            var batchMessage = this.getView().getModel('BatchResponse').oData
            this.setMessagePOST(batchRequests, batchMessage);
        },
        //
        //
        //Gestione CSRF Token
        //
        //
        getCSRFToken: async function (sUrl) {

            var csrfToken = "";

            // Estraggo il Token
            await $.ajax({
                url: sUrl,
                type: 'HEAD', // Utilizza HEAD invece di GET
                headers: { 'x-csrf-token': 'fetch' },
                success: function (data, textStatus, xhr) {
                    // Estrai il valore del token CSRF dall'header della risposta
                    csrfToken = xhr.getResponseHeader('x-csrf-token');
                    let header = xhr.getAllResponseHeaders();
                },
                error: function (oError) {
                    // Gestisci eventuali errori qui
                    console.error(oError);
                }
            });

            return csrfToken;
        },
        //
        //
        //Gestione GET
        //
        //
        async getoData(data) {
            let url = data.url;
            let modelName = data.modelName;
            let propertyName = data.propertyName;

            return new Promise((resolve, reject) => {

                $.ajax({
                    type: "GET",
                    url: url,
                    contentType: 'application/json',
                    success: function (sResult) {
                        try {
                            var value = sResult.value
                            if (data.successExit) {
                                value = data.successExit(value);
                            }
                            this.onSuccessGet(value, modelName, propertyName);
                            resolve(sResult);
                        } catch (error) {
                            this.onError(modelName, propertyName);
                            reject(error);
                        }

                    }.bind(this),
                    error: function (oError) {
                        this.onError(modelName, propertyName);
                        reject(oError);
                    }.bind(this)
                });

            });
        },
        onSuccessGet(value, modelName, propertyName) {

            if (propertyName) {
                const oModel = this.getView().getModel();
                oModel.setProperty(propertyName, value)
            }

            if (modelName) {
                const jModel = new sap.ui.model.json.JSONModel();
                jModel.setData(value);
                this.setModel(jModel, modelName);
            }
        },
        onError(modelName, propertyName) {
            if (propertyName) {
                const oModel = this.getView().getModel();
                oModel.setProperty(propertyName, null)
            }

            if (modelName) {
                const jModel = new sap.ui.model.json.JSONModel();
                this.setModel(jModel, modelName);
            }
        },

        formattBillingPlanUsageCategory(BillingPlanUsageCategory) {
            var value = '';
            switch (BillingPlanUsageCategory) {
                case '':
                    value = "Legacy"
                    break;
                case '1':
                    value = "Fixed Price";
                    break;
                case '2':
                    value = "Time and Expenses";
                    break;
                case '3':
                    value = "Periodic Service";
                    break;
                case '4':
                    value = "Usage-Based Billing";
                    break;
                default:
                    break;
            }
            return value;
        },

        _normalizeType: function (val) {
            return String(val ?? "").replace(/^0+/, "");
        },

        // euristica per scegliere il "miglior" WP:
        // 1) prova quello che termina con ".1.1"
        // 2) altrimenti il primo per SalesOrderItem numerico (se presente)
        // 3) altrimenti il primo in ordine alfabetico di WorkPackage
        _pickPreferredWP: function (list) {
            if (!Array.isArray(list) || list.length === 0) return null;

            const dot11 = list.find(wp => /\.1\.1$/.test(String(wp.WorkPackage || "")));
            if (dot11) return dot11;

            const withNum = list
                .map(wp => ({
                    wp,
                    soi: Number(String(wp.SalesOrderItem || "").replace(/^0+/, "")) // "000001" -> 1
                }))
                .sort((a, b) => (isNaN(a.soi) ? 1 : a.soi) - (isNaN(b.soi) ? 1 : b.soi)
                    || String(a.wp.WorkPackage).localeCompare(String(b.wp.WorkPackage)));

            return withNum[0].wp;
        },

        _createORFilterFromSelectedKeys: function (selectedKeys, fieldName, filterOperator = sap.ui.model.FilterOperator.EQ, andFilters = false) {
            var oFilter = null;

            if (selectedKeys.length > 0) {
                // Crea un array di filtri basati su ciascuna chiave selezionata
                var aFilters = selectedKeys.map(function (key) {
                    return new sap.ui.model.Filter(fieldName, filterOperator, key);
                });

                // Combina i filtri individuali in un unico filtro con un'operazione OR
                oFilter = new sap.ui.model.Filter({
                    filters: aFilters,
                    //and: false // Usa false per un'operazione OR
                    and: andFilters
                });
            }

            return oFilter;
        },

        createFilter: function (arrayData, keyField, filterParameter, logicalOperator) {

            if (arrayData.length <= 0) {
                return;
            }

            //Rimuovo i duplicati
            var uniqueValues = [];

            for (var i = 0; i < arrayData.length; i++) {
                var currentItem = arrayData[i];

                if (uniqueValues.length < 1) {
                    if (currentItem[keyField].length > 0) {
                        uniqueValues.push(currentItem);
                    }
                } else {
                    var exist = uniqueValues.some(function (record) {
                        if (currentItem[keyField].length > 0) {
                            return record[keyField] === currentItem[keyField];
                        } else {
                            return true;
                        }
                    });

                    if (!exist) {
                        uniqueValues.push(currentItem);
                    }
                }
            }

            // Creare un array di filtri per ProjectID
            const UserIdFilters = uniqueValues.map(User => {
                return `${filterParameter} eq '${User[keyField]}'`;
            });

            // Unire i filtri con OR
            const filterString = UserIdFilters.join(` ${logicalOperator} `);
            return filterString;

        },

        _createFilterFromArrayNew: function (aSelectedKeys, sFieldName, keyField) {
            let finalFilter = null; // Inizializza a null per gestire il caso di nessuna chiave selezionata

            if (aSelectedKeys && aSelectedKeys.length > 0) {
                // Crea un set di valori unici per rimuovere duplicati
                const uniqueKeys = new Set(aSelectedKeys.map(key => key[keyField]));

                // Crea i filtri basati sui valori unici
                const aFieldFilters = Array.from(uniqueKeys).map(uniqueKey =>
                    new sap.ui.model.Filter(sFieldName, sap.ui.model.FilterOperator.EQ, uniqueKey));

                // Se ci sono filtri da aggiungere, crea un filtro composto
                if (aFieldFilters.length > 0) {
                    finalFilter = new sap.ui.model.Filter(aFieldFilters, false); // false indica un'operazione OR
                }
            }

            return finalFilter; // Restituisce il filtro composto o null
        },

        createSapFilterFromArray: function (arrayData, keyField, targetField, logicalOperator = 'OR', comparator = 'EQ') {
            if (!Array.isArray(arrayData) || arrayData.length === 0) return null;

            const Filter = sap.ui.model.Filter;
            const FO = sap.ui.model.FilterOperator;

            // 1) estrai valori validi
            const rawValues = arrayData
                .map(obj => obj && obj[keyField])
                .filter(v => v !== undefined && v !== null && String(v).trim() !== '');

            // 2) deduplica mantenendo il tipo originale (string/number/…) 
            const mapUnique = new Map(); // chiave stringa normalizzata -> valore originale
            rawValues.forEach(v => {
                const norm = typeof v === 'string' ? v.trim() : String(v);
                if (norm !== '' && !mapUnique.has(norm)) {
                    mapUnique.set(norm, v);
                }
            });
            const uniqueValues = Array.from(mapUnique.values());

            if (uniqueValues.length === 0) return null;

            // 3) costruisci i singoli filtri (usa il valore originale, non forzare a stringa)
            const op = FO[comparator] || FO.EQ;
            const leafFilters = uniqueValues.map(v => new Filter(targetField, op, v));

            // 4) se uno solo → ritorna il filtro singolo; altrimenti raggruppalo
            if (leafFilters.length === 1) {
                return leafFilters[0];
            }
            const and = String(logicalOperator).toUpperCase() !== 'OR';
            return new Filter({ and, filters: leafFilters });
        }
    })
});
