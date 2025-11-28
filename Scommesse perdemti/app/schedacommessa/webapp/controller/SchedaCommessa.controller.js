sap.ui.define([
    "./BaseController",
    "sap/m/Text",
    "sap/m/MessageBox",
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    "sap/ui/core/UIComponent",
    "sap/ui/core/util/File",
    'sap/m/MessageToast',
    "sap/m/Dialog",
    "../Constants",
    "sap/ui/table/Column",
    'sap/m/Input',
    'sap/ui/core/Fragment',
    "sap/ui/dom/isBehindOtherElement",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/Button",
    "sap/m/library",
    "sap/m/DatePicker",
    "sap/ui/unified/library",
    "sap/ui/unified/DateTypeRange",
    "sap/ui/core/date/UI5Date",
    "sap/ui/core/routing/History",
    "sap/ui/core/syncStyleClass",
    "sap/ui/core/ListItem",
], function (BaseController, Text, MessageBox, Filter, FilterOperator, UIComponent, File, MessageToast, Dialog, Constant, Column, Input, Fragment, isBehindOtherElement, List, StandardListItem, Button, mobileLibrary, DatePicker, UnifiedLibrary, DateTypeRange, UI5Date, History, syncStyleClass, ListItem) {
    "use strict";

    var ButtonType = mobileLibrary.ButtonType;
   var CalendarDayType = UnifiedLibrary.CalendarDayType;
   var aSelectedItemsFromSearch = [];
   var aItemsMatchedDuringSearch = [];

    function normalizeNumber(value) {
        if (value === null || value === undefined || value === "") {
            return 0;
        }
        if (typeof value === "number") {
            return isNaN(value) ? 0 : value;
        }
        var str = String(value).trim();
        if (!str) {
            return 0;
        }
        var normalized = str;
        if (str.indexOf(',') >= 0 && str.indexOf('.') >= 0) {
            normalized = str.replace(/\./g, '').replace(',', '.');
        } else if (str.indexOf(',') >= 0) {
            normalized = str.replace(',', '.');
        }
        var parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    }

    function addTo(obj, key, value) {
        if (!obj) {
            return;
        }
        var current = normalizeNumber(obj[key]);
        obj[key] = current + normalizeNumber(value);
    }

    function sumValues(a, b) {
        return normalizeNumber(a) + normalizeNumber(b);
    }

    function multiplyValues(a, b) {
        return normalizeNumber(a) * normalizeNumber(b);
    }

    return BaseController.extend("schedacommessa.controller.SchedaCommessa", {

        onInit: async function () {
            // Aggiungi listener per vari tipi di eventi per resettare il timer
            ["mousemove", "mousedown", "keypress", "scroll", "touchstart"].forEach(event => {
                document.addEventListener(event, this.resetInactivityTimer.bind(this));
            });

            // Inizializzo il timer di inattività
            this.resetInactivityTimer();

            globalThis.thatSchedaCommessa = this;
            this._allowedWorkPackages = null;
            this._isRevenueDeltaPositive = false;
            this._revenueDeltaPopupShown = false;
            this._revenueDeltaWarningMessage = null;
            var that = globalThis.thatSchedaCommessa;

            var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
            this.initPopoverMessage();
            this._MessageManager.removeAllMessages();

            this.byId("dynamicPageId").setShowFooter(!this.byId("dynamicPageId").getShowFooter());
            oRouter.getRoute("RouteSchedaCommessa").attachMatched(await that._onRouteMatched, that);


            // Inizializza il modello per aggiungere le risorse da addEmployee
            var oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel, "addEmployee");

        },

        onExportExcel: async function () {
            var serviceUrl = this.getView().getModel("schedaCommessa").sServiceUrl; // Modifica con l'URL effettivo del servizio OData
            var actionUrl = serviceUrl + "exportToExcel";

            var headerArray = [];

            var workPackageBillingType = this.getView().getModel().getData().workPackageBillingType;
            var amountToBeBilled = this.getView().getModel().getData().AmountToBeBilled;
            var residualAmount = this.getView().getModel().getData().ResidualAmount;
            var startDate = this.getView().getModel().getData().startDate;
            var endDate = this.getView().getModel().getData().endDate;

            var projectData = this.getView().getModel().getData().Project;

            var orgID = projectData.OrgID;
            var profitCenter = projectData.ProfitCenter;


            // Creazione oggetto per Project di header data
            var projObj = {
                ProjectID: projectData.EngagementProject,
                ProjectName: projectData.ProjectName,
                Customer: projectData.CustomerName,
                Stage: this.formatProjectStage(projectData.ProjectStage),
                ProjectType: this.formattBillingPlanUsageCategory(workPackageBillingType)
            };

            headerArray.push(projObj);

            // Creazione oggetto per Accounting di header data
            var accObj = {
                Company: this.formatCompanyCode(orgID),
                CostCenter: this.formatProfitCenter(profitCenter),
                AmountToBeBilled: amountToBeBilled,
                ResidualAmount: residualAmount
            };

            headerArray.push(accObj);

            // Creazione oggetto per Role di header data
            var roleObj = {
                ProjectManager: projectData.PMPersonFullName,
                Controller1: projectData.PersonFullName_1,
                Controller2: projectData.PersonFullName_2,
                Controller3: projectData.PersonFullName_3,
                Controller4: projectData.PersonFullName_4,
                Controller5: projectData.PersonFullName_5,
                Controller6: projectData.PersonFullName
            };

            headerArray.push(roleObj);

            // Creazione oggetto per Project Date di header data
            var projectDateObj = {
                ChangedOn: this.formatChangedOn2(projectData.ChangedOn),
                StartDate: this.dateFormatter(startDate),
                EndDate: this.dateFormatter(endDate)
            };

            headerArray.push(projectDateObj);

            var headerStringify = JSON.stringify(headerArray);

            var teamTableModel = this.getView().byId("idTable").getBinding().getModel().getData().TreeTable;
            var billingPlanModel = this.getView().getModel().getData().billingplan;
            var CostBalanceModel = this.getView().getModel().getData().CostBalance;
            var expensesModel = this.getView().getModel().getData().Expenses;

            var financialPlanObj = {
                SumCostoMaturato: this.getView().getModel("TreeTable").getData().sumCostoMaturato,
                CurrentMargin: this.getView().getModel("TreeTable").getData().currentMargin,
                SumPrevistoFinire: this.getView().getModel("TreeTable").getData().sumPrevistoFinire,
                BusinessCase: projectData.YY1_BusinessCase_Cpr,
                TotalCost: this.getView().getModel("TreeTable").getData().sumTotCost,
                OriginalPlannedCost: projectData.YY1_OriginalPlannedCos_Cpr,
                CurrentMarginP: this.getView().getModel("TreeTable").getProperty('/businessCase'),
            };

            var financialPlanStringify = JSON.stringify(financialPlanObj);

            // Funzione per filtrare i dati
            function filtraDati(array, propertiesToExclude) {
                return array.map(oggetto => {
                    let oggettoFiltrato = {};
                    for (let chiave in oggetto) {
                        if (!propertiesToExclude.includes(chiave)) {
                            oggettoFiltrato[chiave] = oggetto[chiave];
                        }
                    }
                    return oggettoFiltrato;
                });
            }

            // Filtra e prepara il teamTableModel
            var teamTableModelCopy = JSON.parse(JSON.stringify(teamTableModel));
            var teamTableModelCopyFiltered = filtraDati(teamTableModelCopy, []);
            for (let i = 0; i < teamTableModelCopyFiltered.length; i++) {
                const element = teamTableModelCopyFiltered[i];

                element.ServiceCostLevel = this.formatServiceCostLevel(element.ServiceCostLevel);
                element.TimeSheetOvertimeCategory = this.formatOverTime(element.TimeSheetOvertimeCategory);
                element.CompanyCode = this.formatCompanyCode(element.CompanyCode);
                element.StartDate = this.dateFormatter(element.StartDate);
                element.EndDate = this.dateFormatter(element.EndDate);

                element.WorkPackage = this.formatWBS(element.WorkPackage);
                element.WPStartDate = this.dateFormatter(element.WPStartDate);
                element.WPEndDate = this.dateFormatter(element.WPEndDate);
                element.ActivityType = this.FormatActivityType(element.ActivityType);
            }
            var teamStringify = JSON.stringify(teamTableModelCopyFiltered);

            // Filtra e prepara il billingPlanModel
            var billingPlanModelCopy = JSON.parse(JSON.stringify(billingPlanModel));
            if (this.getView().getModel().getProperty("/workPackageBillingType") !== '2') { //Perchè per la tabella Accounting non si mettere la riga totale se c'è solo una riga
                billingPlanModelCopy.pop(); // Rimuovi l'ultimo elemento
            }

            for (let i = 0; i < billingPlanModelCopy.length; i++) {
                const element = billingPlanModelCopy[i];

                element.BillingPlanBillingDate = this.dateFormatter(element.BillingPlanBillingDate);
            }
            var accountingStringify = JSON.stringify(billingPlanModelCopy);

            var CostBalanceModelCopy = JSON.parse(JSON.stringify(CostBalanceModel));
            CostBalanceModelCopy.pop();
            var CostBalanceModelCopyFiltered = filtraDati(CostBalanceModelCopy, []);
            var CostBalanceStringify = JSON.stringify(CostBalanceModelCopyFiltered);

            // Filtra e prepara l'expensesModel
            var expensesModelCopy = JSON.parse(JSON.stringify(expensesModel));
            expensesModelCopy.pop();
            var expensesModelCopyFiltered = filtraDati(expensesModelCopy, []);
            var expensesStringify = JSON.stringify(expensesModelCopyFiltered);

            // Billing document table
            var billingDocumentArray = this.getView().getModel().getData().ProjectRevenue;

            billingDocumentArray.splice(billingDocumentArray.length - 3, 2);

            for (let i = 0; i < billingDocumentArray.length; i++) {
                const element = billingDocumentArray[i];

                element.AccountingDocumentType = this.formattInvoiceType(element.AccountingDocumentType);
                element.DocumentDate = this.dateFormatter(element.DocumentDate);
                element.NetDueDate = this.dateFormatter(element.NetDueDate);
            }

            var billingDocumentStringify = JSON.stringify(billingDocumentArray);

            // Prepara il payload JSON con i parametri per l'azione
            var payload = {
                Header: headerStringify,
                Team: teamStringify,
                FinancialPlan: financialPlanStringify,
                Accounting: accountingStringify,
                CostBalance: CostBalanceStringify,
                Expenses: expensesStringify,
                BillingDocument: billingDocumentStringify,
                FinancialClosing: this.getView().getModel("PeriodoContabile").getData().Date.toLocaleDateString(),
                WorkPackageBillingType: this.getView().getModel().getProperty("/workPackageBillingType")
            };

            $.ajax({
                url: actionUrl,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(payload),
                success: function (result) {
                    // Gestisci il successo della chiamata
                    console.log("Risultato dell'esportazione Excel:", result);

                    // Assumendo che result contenga la stringa base64 del file Excel
                    // Crea un link di download per il file Excel
                    var base64str = result.excelBase64; // Assicurati che questo corrisponda al percorso della tua stringa base64 nel risultato

                    // Crea un blob dal base64
                    var blob = base64ToBlob(base64str, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    var url = URL.createObjectURL(blob);

                    // Crea un elemento di link temporaneo per il download
                    var downloadElement = document.createElement('a');
                    document.body.appendChild(downloadElement);
                    downloadElement.href = url;
                    downloadElement.download = "export.xlsx"; // Nome del file da salvare
                    downloadElement.click(); // Simula un click per scaricare il file

                    // Pulisci rimuovendo l'elemento link e revocando l'URL del blob
                    document.body.removeChild(downloadElement);
                    URL.revokeObjectURL(url);
                },
                error: function (xhr, status, error) {
                    // Gestisci eventuali errori della chiamata
                    console.error("Errore durante l'esportazione Excel:", error);
                }
            });

            // Funzione helper per convertire una stringa base64 in Blob
            function base64ToBlob(base64, contentType) {
                var byteCharacters = atob(base64);
                var byteArrays = [];

                for (var offset = 0; offset < byteCharacters.length; offset += 512) {
                    var slice = byteCharacters.slice(offset, offset + 512);

                    var byteNumbers = new Array(slice.length);
                    for (var i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }

                    var byteArray = new Uint8Array(byteNumbers);
                    byteArrays.push(byteArray);
                }

                var blob = new Blob(byteArrays, { type: contentType });
                return blob;
            }
        },

        _onRouteMatched: async function (oEvent) {

            this._MessageManager.removeAllMessages();
            var that = globalThis.thatSchedaCommessa;
            this._revenueDeltaPopupShown = false;
            this._isRevenueDeltaPositive = false;
            if (this._revenueDeltaWarningMessage) {
                this._MessageManager.removeMessages(this._revenueDeltaWarningMessage);
                this._revenueDeltaWarningMessage = null;
                this.formatButton();
            }
            var oModelName = 'FinPlanTab';
            const oModel = new sap.ui.model.json.JSONModel({});
            oModel.setData(Constant["FinPlanTab"]);
            this.setModel(oModel, oModelName);
            var EngagementProjectUUID = oEvent.getParameters().arguments.EngagementProjectUUID;
            this.openBusyDialog();
            try {
                Promise.all([
                    this.getUser(),
                    this.getProject(EngagementProjectUUID),]).then(
                        function (resps) {
                            var Proj = resps[1].value[0];
                            var Project = Proj.EngagementProject;
                            var startDate = Proj.StartDate;
                            var endDate = Proj.EndDate;
                            var customer = Proj.Customer;
                            var orgId = Proj.OrgID;
                            var ProjectCategory = Proj.ProjectCategory;

                            globalThis.startDate = startDate;
                            globalThis.endDate = endDate;
                            var dStartDate = new Date(startDate);
                            var dEndDate = new Date(endDate);

                            let currentYear = new Date().getFullYear();

                            let startDateYear = new Date(startDate); //.setFullYear(currentYear);
                            let endDateYear = new Date(endDate); // dEndDate.setFullYear(currentYear);

                            startDateYear.setFullYear(currentYear);
                            endDateYear.setFullYear(currentYear);

                            let startyear = dStartDate.getFullYear();
                            let endyear = dEndDate.getFullYear();


                            var oModel = new sap.ui.model.json.JSONModel({
                                startDate: startDate,
                                endDate: endDate,
                                dStartDate: dStartDate,
                                dEndDate: dEndDate,
                                startDateYear: startDateYear.toJSON().split('T')[0],
                                endDateYear: endDateYear.toJSON().split('T')[0],
                                customer: customer,
                                orgId: orgId,
                                userLogged: resps[0],
                                Project: Project,
                                ProjectB: Proj,
                                AmountToBeBilled: 0,
                                ProjectCategory: ProjectCategory
                            });

                            var that = globalThis.thatSchedaCommessa;
                            var oModelCompany = new sap.ui.model.json.JSONModel([{ CompanyCode: '1000', description: 'Lobra S.r.l.' }, { CompanyCode: '2000', description: 'Lobra Futura S.r.l.' }, { CompanyCode: '3000', description: 'Athenea S.r.l.' }]);

                            this.getView().setModel(oModelCompany, "CompanyCode");
                            that.getView().setModel(oModel);
                            this.getView().setModel(oModel, "currentProjectModel");

                            var oTable = that.getView().byId("idTable");
                            oTable.setBusy(true);
                            if (endyear - startyear > 1) {
                                this.onProjectDate();
                            } else {
                                Promise.all([that.makeAllGet(Project, orgId, customer, startDate, endDate, ProjectCategory)]).then(
                                    function () {
                                        that.setExpense();
                                        globalThis.monthNumber = that.monthDiff(dStartDate, dEndDate);
                                        that.dateFilter(startDate, endDate);
                                        oTable.setBusy(false);

                                    }.bind(that))
                            }

                        }.bind(this))
            } catch (error) {
                location.reload();
            }

        },


        makeAllGet: async function (Project, orgId, customer, startDate, endDate, ProjectCategory) {
            if (ProjectCategory === 'I') {
                Promise.all([
                    this.getWorkpackage(Project),
                    this.getUsers(orgId, customer, startDate, endDate),
                    this.setPeriodoContabile(),
                    this.getExpensesText(),
                    this.getServiceCostLevelText(),
                    this.getWorkingDaysNumber(startDate, endDate),
                    this.getDistattacati(orgId),
                    this.getDummy(),
                    this.getoverTimeCategory(),
                ]).then(
                    function () {
                        this.getCostBalance(orgId);
                        this.makeDependentGetInternalProject(Project, startDate, endDate);
                    }.bind(this)
                ).catch((error) => {
                    this.handleCatch(error, 'firstExtraction')
                    this._pBusyDialog.then(async function (oBusyDialog) {
                        oBusyDialog.close();
                    });
                });

            } else {
                Promise.all([
                    this.getWorkpackage(Project),
                    this.getItemText(Project),
                    this.getUsers(orgId, customer, startDate, endDate),
                    this.setPeriodoContabile(),
                    this.getExpensesText(),
                    this.getBillingPlan(Project),
                    this.getServiceCostLevelText(),
                    this.getWorkingDaysNumber(startDate, endDate),
                    this.getDistattacati(orgId),
                    this.getDummy(),
                    this.getoverTimeCategory(),
                ]).then(
                    function () {
                        this.getCostBalance(orgId);
                        this.makeDependentGet(Project, orgId, customer, startDate, endDate);
                        try {
                            this.setPianoContabile();
                        }
                        catch (error) {
                            this.handleCatch(error, 'setPianoContabile')
                        }
                    }.bind(this)
                ).catch((error) => {
                    this.handleCatch(error, 'firstExtraction')
                    this._pBusyDialog.then(async function (oBusyDialog) {
                        oBusyDialog.close();
                    });
                });
            }
        },

        makeDependentGetInternalProject: async function (Project, startDate, endDate) {

            var message = [];
            var fiscalYear = this.getFiscalYear();

            this.getAttachment();
            try {
                await this.getWorkPackageType();
            } catch (error) {
                this.handleCatch(error, 'WorkPackageType');
            }

            Promise.all([
                this.getTrasfertaMaturatoAll(),
                this.getScrittureTrasferteMaturato(),
                this.getTimesheet(),
                this.getServiceCostLevel(startDate, endDate),
                this.getProfitCenter(),
                this.getProjectStage(),
                this.OdaExpenses(),
                this.getMaturatoTimesheet(),
                this.getRequestItem(Project, fiscalYear.fiscalYear, fiscalYear.Period),
                this.getWBSDescr(),
                this.getOdaCollaboratore(),
                this.getDemand(),
            ]).then(
                function () {
                    let promises = this.getTrasfertaByUser();
                    promises.push(this.getPOHistory());
                    this.setProjectModel();
                    this.setStaffingTable(globalThis.monthNumber, globalThis.startDate);
                    Promise.all(promises).then(function () {
                        this.setExpensesTable();
                        this.setEmpList();
                        this.setActivityType();
                        this.populateStaffed();
                        this.sumCostoMaturato();
                        this.sumPrevistoFinire();
                        this._pBusyDialog.then(async function (oBusyDialog) {
                            this.updateExpectedFinish();
                            this.setEditabilityTableRows();
                            oBusyDialog.close();
                        }.bind(this));
                    }.bind(this));
                }.bind(this)
            ).catch((error) => {
                this.handleCatch(error, 'SecondExtraction');
                this._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.close();
                });

            });
            this.formatButton();

        },
        makeDependentGet: async function (Project, orgId, customer, startDate, endDate) {

            var message = [];
            var fiscalYear = this.getFiscalYear();


            this.getAttachment();
            try {
                await this.getWorkPackageType();
            } catch (error) {
                this.handleCatch(error, 'WorkPackageType');
            }
            Promise.all([
                this.getTrasfertaMaturatoAll(),
                this.getScrittureTrasferteMaturato(),
                this.getTimesheet(),
                this.getServiceCostLevel(startDate, endDate),
                this.getProfitCenter(),
                this.getProjectStage(),
                this.OdaExpenses(),
                this.getMaturatoTimesheet(),
                this.getRequestItem(Project, fiscalYear.fiscalYear, fiscalYear.Period),
                this.getWBSDescr(),
                this.getWorkpackageRelBP(),
                this.getOdaCollaboratore(),
                this.getDemand(),
            ]).then(
                function () {
                    this.syncTrasfertaByUser();

                    //this.populateStaffed();
                }.bind(this)
            ).catch((error) => {
                this.handleCatch(error, 'SecondExtraction');
                this._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.close();
                });

            });
            this.formatButton();

        },
        async syncTrasfertaByUser() {
            let promises = this.getTrasfertaByUser();
            promises.push(this.getProjectRevenue());
            promises.push(this.getPOHistory());
            this.setProjectModel();
            Promise.all(promises)
                .then(function () {
                    this.setExpensesTable();

                    this.setEmpList();
                    this.setActivityType();
                    this.populateStaffed();
                    this.setStaffingTable(globalThis.monthNumber, globalThis.startDate);
                    this.getNetDueDate();

                    this.setBillingDoc();
                    //posto a caso, è la fine di tutto
                    this.sumCostoMaturato();
                    this.sumPrevistoFinire();
                    this._pBusyDialog.then(async function (oBusyDialog) {
                        this.setEditabilityTableRows();
                        let oTableBill = this.getView().byId('idTableBillingDocument');

                        this.setLast3RowBold(oTableBill);
                        this.checkBillingType();
                        this.updateExpectedFinish();
                        oBusyDialog.close();
                    }.bind(this));

                }.bind(this))
        },
        manageProjectRevenue() {
            Promise.all([
                this.getProjectRevenue()
            ])
                .then(function () {
                    this.getNetDueDate();
                    //posto a caso, è la fine di tutto
                    this.sumCostoMaturato();
                    this.sumPrevistoFinire();
                    this.setEditabilityTableRows();
                    let oTableBill = this.getView().byId('idTableBillingDocument');
                    this.setLastRowBold(oTableBill);
                    this.checkBillingType();
                    this.updateExpectedFinish();
                    this._pBusyDialog.then(async function (oBusyDialog) {
                        oBusyDialog.close();
                    });
                }.bind(this))
                .catch((error) => {
                    this.handleCatch(error, 'SecondExtraction')
                    this._pBusyDialog.then(async function (oBusyDialog) {
                        oBusyDialog.close();
                    });
                }
                )
        },

        setEditabilityTableRows() {
            this.setEditableTable("idTable");
            let treeTable = this.getView().getModel("TreeTable").oData.TreeTable;
            let pStartDate = this.setCurrentDate(globalThis.PeriodDate, globalThis.startDate);
            let pEndDate = new Date(globalThis.endDate);

            for (let ind = 0; ind < treeTable.length; ind++) {
                if (treeTable[ind].TimeSheetOvertimeCategory !== 'Z010') {
                    this.setRawUneditable("idTable", ind);
                    continue;
                }
                let eStartDate = this.setCurrentDate(treeTable[ind].StartDate, treeTable[ind].WPStartDate);
                let eEndDate = new Date(treeTable[ind].EndDate);

                if (treeTable[ind].EndDate > treeTable[ind].WPEndDate) {
                    eEndDate = new Date(treeTable[ind].WPEndDate);
                }

                let max = this.monthDiff(pStartDate, pEndDate) - this.monthDiff(eEndDate, pEndDate) + 1;
                let min = this.monthDiff(pStartDate, eStartDate) - 1;

                if (min > 0) {
                    this.setRawUneditable("idTable", ind, null, min);
                }
                if (max < this.monthDiff(pStartDate, pEndDate)) {
                    this.setRawUneditable("idTable", ind, max, null);
                }
            }

            this.setRawUneditable('idTable');
        },


        liveDateChange(oEvent) {

            var oView = this.getView();

            var oButton = oView.byId('ProjectDateButton');
            var oModel = oView.getModel();

            var startDate = oModel.getProperty('/startDate');
            var endDate = oModel.getProperty('/endDate');

            var oSource = oEvent.getSource();
            var sourceDate = new Date(oSource.getValue());
            sourceDate.setHours(0);

            var dStartDate = new Date(startDate);
            var dendDate = new Date(endDate);

            dStartDate.setHours(0);
            dendDate.setHours(0);

            if (sourceDate >= dStartDate && sourceDate <= dendDate) {
                oButton.setEnabled(true);
                oSource.setValueState(sap.ui.core.ValueState.Information)
            } else {
                oSource.setValueState(sap.ui.core.ValueState.Error)
                oSource.setValueStateText('Invalid Date')
                oButton.setEnabled(false);
            }

        },
        onOkProjectDate(evt) {
            var oView = this.getView();

            //Project Date

            var ProjectStartDate = oView.byId('ProjectStartDate');
            var ProjectEndDate = oView.byId('ProjectEndDate');

            var startDate = ProjectStartDate.getValue();
            var endDate = ProjectEndDate.getValue();

            var dStartDate = new Date(startDate);
            var dEndDate = new Date(endDate);

            if (dEndDate < dStartDate) {
                ProjectStartDate.setValueState(sap.ui.core.ValueState.Error);
                ProjectEndDate.setValueState(sap.ui.core.ValueState.Error);

                ProjectStartDate.setValueStateText('Start date greater than end date');
                ProjectEndDate.setValueStateText('Start date greater than end date');
            } else {


                //Project Model
                var oModel = oView.getModel();

                dEndDate.setHours(12);
                dStartDate.setHours(12);
                let endDates = dEndDate.toJSON();
                let startDates = dStartDate.toJSON();

                endDate = endDates.split('T')[0];
                startDate = startDates.split('T')[0];

                globalThis.endDate = endDate;
                globalThis.startDate = startDate;

                oModel.setProperty('/endDate', endDate);
                oModel.setProperty('/startDate', startDate);

                let Project = oModel.getProperty('/Project');
                let orgId = oModel.getProperty('/orgId');
                let customer = oModel.getProperty('/customer');
                let ProjectCategory = oModel.getProperty('/ProjectCategory');

                this.closeProjectDateDialog();

                var oTable = oView.byId("idTable");

                Promise.all([this.makeAllGet(Project, orgId, customer, startDate, endDate, ProjectCategory)]).then(
                    function () {
                        this.setExpense();
                        globalThis.monthNumber = this.monthDiff(dStartDate, dEndDate);
                        this.dateFilter(startDate, endDate);
                        oTable.setBusy(false);

                    }.bind(this))
            }
        },
        openBusyDialog: function () {

            if (!this._pBusyDialog) {
                this._pBusyDialog = Fragment.load({
                    name: "schedacommessa.view.BusyDialog",
                    controller: this,
                }).then(
                    function (oBusyDialog) {
                        this.getView().addDependent(oBusyDialog);
                        syncStyleClass("sapUiSizeCompact", this.getView(), oBusyDialog);
                        oBusyDialog.open();
                        return oBusyDialog;
                    }.bind(this)
                );
            } else {
                this._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.open();
                });
            }
        },
        closecDialog: function () {
            this._cDialog.then(function (oDialog) {
                oDialog.close();
                oDialog.destroy();
            })
            this._cDialog = null;
        },
        closeDialog: function () {
            this._empDialog.then(function (oDialog) {
                oDialog.close();
                oDialog.destroy();
            })
            this._empDialog = null;
        },
        closeProjectDateDialog: function () {
            this._prjDateDialog.then(function (oDialog) {
                oDialog.close();
                oDialog.destroy();
            })
            this._prjDateDialog = null;
        },
        closeDialogExp: function () {
            this._expDialog.then(function (oDialog) {

                oDialog.close();
                oDialog.destroy();
            })
            this._expDialog = null;
        },
        onResourcePlanningCloseDialog: function () {
            this._MRPDialog.then(function (oDialog) {
                if (oDialog) {
                    const jModel = new sap.ui.model.json.JSONModel();
                    this.setModel(jModel, 'ResourcePlanning');
                    oDialog.close();
                    oDialog.destroy();
                }
            }.bind(this));
            this._MRPDialog = null;
        },
        onMenuAction(oEvent) {
            var oItem = oEvent.getParameter("item");
            var that = globalThis.thatSchedaCommessa,
                oTable = that.getView().byId('idTable');
            switch (oItem.getText()) {
                case 'User Detail':
                    oTable.setFixedColumnCount(7)
                    break;
                case "Work Package Detail":
                    oTable.setFixedColumnCount(14)
                    break;
                case 'Costs':
                    oTable.setFixedColumnCount(16)
                    break;
                case "Travel":
                    oTable.setFixedColumnCount(17)
                    break;
                case "Days":
                    oTable.setFixedColumnCount(19)
                    break;
                default:
                    oTable.setFixedColumnCount(20)
                    break;
            }
        },
        ErrorFilling: function (name) {
            this.getView().byId(name).setValueState(sap.ui.core.ValueState.Error),
                MessageToast.show('fill in all mandatory fields');
        },
        successFill(name) {
            this.getView().byId(name).setValueState(sap.ui.core.ValueState.None)
        },
        AddEmpPress: function (evt) {


            if (!evt) { } else {
                var that = globalThis.thatSchedaCommessa;
                var oModel = that.getView().getModel();
                var productInput = that.getView().byId("productInput");
                var aSelectedItems = productInput.getTokens();
                var WorkPackage = that.getView().getModel('WorkPackage').oData;
                if (!aSelectedItems || aSelectedItems.length === 0) {
                    this.ErrorFilling("productInput");
                    return;
                } else {
                    this.successFill('productInput')
                }
                var WorkPackageID = this.getView().byId('idComboBoxAddWorkPackage').getSelectedKey();
                if (!WorkPackageID) {
                    this.ErrorFilling('idComboBoxAddWorkPackage');
                    return;
                } else {
                    this.successFill('idComboBoxAddWorkPackage')
                }
                var Activity = this.getView().byId('idComboBoxAddActivityType').getSelectedKey();
                if (!Activity) {
                    this.ErrorFilling('idComboBoxAddActivityType');
                    return;
                } else {
                    this.successFill('idComboBoxAddActivityType')
                }


                var oTable = that.getView().byId("idTable");
                this.setRawEditable("idTable");
                oTable.unbindRows();


                var TreeTable = that.getView().getModel("TreeTable").oData.TreeTable;

                TreeTable.splice(TreeTable.length - 1, 1);


                var EmpSel = [];
                productInput.removeAllTokens();
                this.getView().byId('idComboBoxAddActivityType').setSelectedKey('');
                this.getView().byId('idComboBoxAddWorkPackage').setSelectedKey('');

                if (aSelectedItems && aSelectedItems.length > 0) {
                    var ActivityTypeWP = that.getView().getModel().getProperty('/ActivityType');

                    oModel.setProperty('/EmpSelected', {});


                    aSelectedItems.forEach(function (oItem) {

                        let StaffingRaw = that.getStaffingRaw('StaffingTable', globalThis.monthNumber, globalThis.startDate);
                        let Emp = oModel.getProperty(oItem.getKey());
                        let Revenue = ActivityTypeWP.find(e => e.ActivityType === Activity);
                        StaffingRaw['PersonWorkAgreement'] = "00000000";
                        StaffingRaw['Person'] = "00000000";
                        that.moveCorresponding(Emp, StaffingRaw);
                        that.setStaffingRawZero(StaffingRaw);
                        StaffingRaw.ActivityType = Activity;
                        StaffingRaw.WorkPackage = WorkPackageID;
                        StaffingRaw = that.setWorkPackage(StaffingRaw, WorkPackage);
                        if (!that._isWorkPackageAllowed(StaffingRaw.WorkPackage)) {
                            return;
                        }
                        StaffingRaw.TimeSheetOvertimeCategory = Activity === 'T008' ? 'Z011' : 'Z010';
                        StaffingRaw.Revenue = Revenue.Revenue ? Revenue.Revenue : '0'

                        let find = TreeTable.find(e => e.WorkPackage === StaffingRaw.WorkPackage
                            && e.ActivityType === StaffingRaw.ActivityType
                            && e.PersonWorkAgreement === StaffingRaw.PersonWorkAgreement
                            && e.TimeSheetOvertimeCategory === StaffingRaw.TimeSheetOvertimeCategory
                            && e.EndDate === StaffingRaw.EndDate)

                        if (!find) {
                            TreeTable.push(StaffingRaw);
                        } else {
                            EmpSel.push({ PersonFullName: StaffingRaw.PersonFullName, Counter: EmpSel.length });
                        }
                    })

                    TreeTable.push(that.setLastValue(TreeTable));
                    oTable.bindRows({
                        path: "TreeTable>/TreeTable",
                        parameters: {
                            arrayNames: ["categories"] // Specifica la chiave per il raggruppamento
                        }
                    });

                    this.getView().byId("idTable").setVisibleRowCount(TreeTable.length);

                    if (EmpSel.length > 0) {
                        oModel.setProperty('/EmpSelected', EmpSel);
                        that.onDefaultDialogPress();
                    }

                };


                this._empDialog.then(function (oDialog) {
                    oDialog.close();
                    oDialog.destroy();
                    //this.setRawUneditable("idTable");
                    this.setEditabilityTableRows();
                }.bind(this))
                this._empDialog = null;


            }
        },
        setProjectModel() {
            var oModel = this.getView().getModel();
            var value = oModel.getProperty('/ProjectB');
            oModel.setProperty('/Project', value);
            this.getView().byId('idheaderDataSimpleForm').setVisible(true);
        },
        onSelectPlanning(evt) {
            var that = globalThis.thatSchedaCommessa;
            var oSelectedEmp = that.setSelectedEmp();

            that.setViewEditability(oSelectedEmp.SelectedEmp);

            const jModel = new sap.ui.model.json.JSONModel();
            jModel.setData({ ...oSelectedEmp.SelectedEmp, sId: oSelectedEmp.sId });
            that.setModel(jModel, 'ResourcePlanning');
        },
        setSelectedEmp() {
            var that = globalThis.thatSchedaCommessa;
            var selectedItem = that.getView().byId("iResourcePlanning").getSelectedItem();
            var oModel = selectedItem.getModel("TreeTable");
            var oContext = selectedItem.getBindingContext('TreeTable')
            var sPath = oContext.getPath();
            var oSelectedEmp = oModel.getProperty(sPath);
            return { SelectedEmp: oSelectedEmp, sId: sPath };
        },
        setViewEditability(oSelectedEmp) {

            var that = globalThis.thatSchedaCommessa;
            var elements = that.getView().byId('SimpleFormDisplayResPlanning').getContent();

            let pStartDate = that.setCurrentDate(globalThis.PeriodDate, globalThis.startDate);
            let pEndDate = new Date(globalThis.endDate);

            if (oSelectedEmp.WorkPackage !== '' && oSelectedEmp.TimeSheetOvertimeCategory === 'Z010' && oSelectedEmp.ActivityType) {
                let WorkPackage = this.getView().getModel('WorkPackage').getData();
                let selWorkPackage = WorkPackage.find(e => e.WorkPackageID === oSelectedEmp.WorkPackage);

                let WPStartDate = new Date(selWorkPackage.WPStartDate);
                let WPEndDate = new Date(selWorkPackage.WPEndDate);

                let eEndDate = new Date(oSelectedEmp.EndDate);
                let eStartDate = new Date(oSelectedEmp.StartDate);

                if (WPStartDate > eStartDate) {
                    eStartDate = WPStartDate;
                }
                if (WPEndDate < eEndDate) {
                    eEndDate = WPEndDate;
                }

                let max = that.monthDiff(pStartDate, pEndDate) - this.monthDiff(eEndDate, pEndDate);
                let min = that.monthDiff(pStartDate, eStartDate) - 1;

                // that.setSimpleFormEditability(elements, 0, that.monthDiff(pStartDate, pEndDate));
                if (max < 0) {
                    that.setSimpleFormEditability(elements, 10, -1);
                } else {
                    that.setSimpleFormEditability(elements, min, max);
                }

            } else {
                let max = 0
                let min = 1;

                that.setSimpleFormEditability(elements, min, max);
            }
        },
        onProjectDate: function () {
            var oView = this.getView();

            if (!this._prjDateDialog) {
                this._prjDateDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.setStartEndDate",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._prjDateDialog.then(function (oDialog) {
                oDialog.open();
            }.bind(this));
        },
        onAddExp: function () {
            var oView = this.getView();

            if (!this._expDialog) {
                this._expDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.AddExpenses",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._expDialog.then(function (oDialog) {
                oDialog.open();
            }.bind(this));
        },
        onModifyResourcePlanning() {
            var oView = this.getView();

            if (!this._MRPDialog) {
                this._MRPDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.ModifyResourcePlanning",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    this.createInputValue();
                    return oDialog;
                }.bind(this));
            }

            this._MRPDialog.then(function (oDialog) {
                let type = this.getView().getModel().getProperty('/workPackageBillingType');
                var Activity = this.getView().byId('ResourcePlanningAT');
                var Label = this.getView().byId('ResourcePlanningATLabel');
                if (type === '2') {
                    Activity.setVisible(true);
                    Label.setVisible(true);
                } else {
                    Activity.setVisible(false);
                    Label.setVisible(false);
                }
                oDialog.open();

            }.bind(this));
        },

        onAddEmp: function () {
            var oView = this.getView();

            if (!this._empDialog) {
                this._empDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.AddEmp",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._empDialog.then(function (oDialog) {
                let type = this.getView().getModel().getProperty('/workPackageBillingType');
                let WorkPackage = this.getView().getModel('WorkPackage').getData();

                if (WorkPackage.length === 1) {
                    var WorkPackageBox = this.getView().byId('idComboBoxAddWorkPackage');
                    WorkPackageBox.setSelectedKey(WorkPackage[0].WorkPackageID);
                    this.onChangeWorkpackage();
                }

                var Activity = this.getView().byId('idComboBoxAddActivityType');
                var Label = this.getView().byId('lableidComboBoxAddActivityType');
                if (type === '2') {
                    Activity.setVisible(true);
                    Label.setVisible(true);
                } else {
                    Activity.setVisible(false);
                    Label.setVisible(false);
                }
                oDialog.open();

            }.bind(this));
        },

        handleTableSelectDialogPress: function (Staffed) {
            var oView = this.getView();

            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.OrderDetail",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pDialog.then(function (oDialog) {
                oDialog.setTitle('Orders of ' + Staffed.PersonFullName);
                oDialog.open();
            }.bind(this));
        },
        handleTableSelectDialogPressConcur: function (Staffed) {
            var oView = this.getView();

            if (!this._cDialog) {
                this._cDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.Concur",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._cDialog.then(function (oDialog) {
                oDialog.setTitle('Travel Expenses of ' + Staffed.PersonFullName + ', Totals: ' + Staffed.TrasfertaMaturato);
                oDialog.open();
            }.bind(this));
        },
        handleTableSelectDialogPressExpense: function (evt) {
            try {
                var oView = this.getView();

                let path = evt.getSource().getBindingContext().getPath();
                let element = this.getView().getModel().getProperty(path);

                var Oda = this.getOdaFiltered(element.EngagementProjectResource);
                oView.getModel().setProperty('/Oda', Oda);

            } catch (error) {
                this.handleCatch(error, 'GetOrderExpenses')

            }
            if (!this._eDialog) {
                this._eDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.ExpenseOrder",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._eDialog.then(function (oDialog) {
                oDialog.open();
            }.bind(this));
        },
        handleTableSelectDialogPressInvoice: function (evt) {
            var oView = this.getView();

            let path = evt.getSource().getBindingContext().getPath();
            let element = this.getView().getModel().getProperty(path);
            let SupplierInvoice = this.getView().getModel().getProperty('/TrasfertaMaturatoAll');

            if (element.EngagementProjectResource) {
                SupplierInvoice = SupplierInvoice.filter(e => element.EngagementProjectResource === e.EngagementProjectResource);
            }
            oView.getModel().setProperty('/SupplierInvoice', SupplierInvoice);

            if (!this._iDialog) {
                this._iDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.MaturatoTrasferta",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._iDialog.then(function (oDialog) {
                oDialog.open();
            }.bind(this));
        },

        handleSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter("PersonFullName", FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        handleValueHelp: function (oEvent) {
            var sInputValue = oEvent.getSource().getValue(),
                oView = this.getView(),
                oMultiInput = this.byId("productInput");

            oMultiInput.removeAllTokens();

            // create value help dialog
            if (!this._pValueHelpDialog) {
                this._pValueHelpDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.EmpValueHelp",
                    controller: this
                }).then(function (oValueHelpDialog) {
                    oView.addDependent(oValueHelpDialog);
                    return oValueHelpDialog;
                });
            }

            this._pValueHelpDialog.then(function (oValueHelpDialog) {
                // create a filter for the binding
                oValueHelpDialog.getBinding("items").filter([new Filter(
                    "PersonFullName",
                    FilterOperator.Contains,
                    sInputValue
                )]);
                // open value help dialog filtered by the input value
                oValueHelpDialog.open(sInputValue);
            });
        },
        _handleOrderDetailSearch: function (evt) {

            var sValue = evt.getParameter("value");
            var oFilter = new Filter(
                "PurchaseOrder",
                FilterOperator.Contains,
                sValue
            );
            evt.getSource().getBinding("items").filter([oFilter]);
        },
        _handleTravelDetailSearch: function (evt) {

            var sValue = evt.getParameter("value");
            var oFilter = new Filter(
                "GLAccountLongName",
                FilterOperator.Contains,
                sValue
            );
            evt.getSource().getBinding("items").filter([oFilter]);
        },
        _handleValueHelpSearch: function (evt) {
            var sValue = evt.getParameter("value");
            var oFilter = new Filter(
                "PersonFullName",
                FilterOperator.Contains,
                sValue
            );
            evt.getSource().getBinding("items").filter([oFilter]);
        },

        handleValueHelpClose: function (oEvent) {
            /*
            var oMultiInput = this.byId("productInput");
            oMultiInput.removeAllTokens();

            var oModel = this.getView().getModel("addEmployee");

            var aSelectedItems = oModel.oData.selectedRows;

            if (aSelectedItems && aSelectedItems.length > 0) {
                aSelectedItems.forEach(function (oItem) {
                    oMultiInput.addToken(new sap.m.Token({
                        text: oItem.PersonFullName,
                        key: oItem.Path
                    }));
                });
            }*/
        },

        // Metodo per gestire la selezione delle righe
        onSelectionRow: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("listItems"),
                oMultiInput = this.byId("productInput");

            aSelectedItems.forEach(aSelectedItem => {
                let title = aSelectedItem.getCells()[0].getTitle(),
                    key = aSelectedItem.getBindingContext().getPath();


                if (aSelectedItem.getProperty('selected')) {
                    oMultiInput.addToken(new sap.m.Token({
                        text: title,
                        key: key,
                    }));
                } else {
                    var oTokens = oMultiInput.getTokens();
                    for (let i = 0; i < oTokens.length; i++) {
                        if (oTokens[i].getKey() === key) {
                            oMultiInput.removeToken(i)
                            break;
                        }
                    }
                }
            })
        },


        getOdaFiltered(resource) {
            var OdaExpenses = this.getView().getModel('OdaExpenses').getData();
            let values = [];
            switch (resource) {
                case 'E001':
                    values = OdaExpenses.filter(e => e.Supplier !== '1000' && e.Supplier !== '2000' && e.Supplier !== '3000')
                    break;
                case 'E002':
                    break;
                case 'E003':
                    values = OdaExpenses.filter(e => e.Supplier === '1000');
                    break;
                case 'E004':
                    values = OdaExpenses.filter(e => e.Supplier === '2000');
                    break;
                case 'E005':
                    values = OdaExpenses.filter(e => e.Supplier === '3000');
                    break;
                case 'E006':
                    break;
                default:
                    values = OdaExpenses.filter(e => true);
                    break;
            }
            return values;
        },
        setExpensesTable: function () {
            var that = globalThis.thatSchedaCommessa;

            var ExpText = that.getView().getModel('ExpenseType').getData();
            var Expense = that.getView().getModel('Expense').getData();
            var TrasfertaMaturatoAll = that.getView().getModel().getProperty('/TrasfertaMaturatoAll');
            // var POHistory = that.getView().getModel().getProperty('/POHistory');

            var Expenses = [];
            var oModel = that.getView().getModel();
            oModel.setProperty("/Expenses", {});


            ExpText.forEach((Element) => {
                let obj = Element;

                let Exp = Expense.filter(e => e.ActivityType === Element.EngagementProjectResource);
                let Oda = this.getOdaFiltered(Element.EngagementProjectResource);
                let maturato = TrasfertaMaturatoAll.filter(e => e.EngagementProjectResource === Element.EngagementProjectResource);
                const totalOda = Oda.reduce(
                    (accumulator, currentValue) => sumValues(accumulator, currentValue.NetAmount),
                    0
                );
                const totalMaturato = maturato.reduce(
                    (accumulator, currentValue) => sumValues(accumulator, currentValue.AmountInTransactionCurrency),
                    0
                );
                obj['nOda'] = `${this.formatCurr(totalOda)} (${Oda.length})`;
                obj['nInv'] = `${this.formatCurr(totalMaturato)} (${maturato.length})`;

                const sum = Exp.reduce(
                    (accumulator, currentValue) => sumValues(accumulator, currentValue.PlndCostAmt),
                    0
                );
                try {
                    obj['actuals'] = Oda.reduce(
                        (accumulator, currentValue) => sumValues(accumulator, currentValue.NetAmount),
                        0
                    );
                } catch (error) {
                    obj['actuals'] = '0';
                }
                obj['sum'] = sum;
                if (Element.EngagementProjectResource === 'E006') {
                    obj['actuals'] = totalMaturato;
                }

                if (obj.actuals + '' !== '0' || obj.sum + '' !== '0') {
                    Expenses.push(obj)
                }
            })
            let totOda = this.getOdaFiltered('Total');
            const totalOdaAmount = totOda.reduce(
                (accumulator, currentValue) => sumValues(accumulator, currentValue.NetAmount),
                0
            );
            const totalTrasferta = TrasfertaMaturatoAll.reduce(
                (accumulator, currentValue) => sumValues(accumulator, currentValue.AmountInTransactionCurrency),
                0
            );
            const totalTrasfertaE006 = TrasfertaMaturatoAll
                .filter(e => e.EngagementProjectResource === 'E006')
                .reduce((accumulator, currentValue) => sumValues(accumulator, currentValue.AmountInTransactionCurrency), 0);
            let obj = {
                EngagementProjResourceText: 'Total',
                sum: Expenses.reduce(
                    (accumulator, currentValue) => sumValues(accumulator, currentValue.sum),
                    0
                ),
                actuals: sumValues(totalOdaAmount, totalTrasfertaE006),
                nOda: `${this.formatCurr(totalOdaAmount)} (${totOda.length})`,
                nInv: `${this.formatCurr(totalTrasferta)} (${TrasfertaMaturatoAll.length})`,
            }
            Expenses.push(obj);
            oModel.setProperty("/Expenses", Expenses);

            this.formatExpensesTable(Expenses);

        },

        formatExpensesTable(Expenses) {
            const idExpensesTable = 'idTable4';
            var oTable = this.getView().byId(idExpensesTable);
            var RawCells = oTable.getItems();
            Expenses.forEach((Element, index) => {
                let cells = RawCells[index].getCells();

                if (Element.nOda.indexOf('(0)') < 0) {
                    cells[cells.length - 2].setType("Transparent");
                    cells[cells.length - 2].setEnabled(true)
                } else {

                    cells[cells.length - 2].setType("Transparent");
                    cells[cells.length - 2].setEnabled(false);
                }
                if (Element.nInv.indexOf('(0)') < 0) {

                    cells[cells.length - 1].setType("Transparent");
                    cells[cells.length - 1].setEnabled(true);
                } else {
                    cells[cells.length - 1].setType("Transparent");
                    cells[cells.length - 1].setEnabled(false);
                }
            })
        },
        onPressDownload(oEvent) {
            var path = oEvent.getSource().getBindingContext().getPath()
            var element = this.getView().getModel().getProperty(path);

            if (element.DocumentURL) {
                window.open(element.DocumentURL, '_blank');
                return;
            }
            let url = `/odata/v4/staffinglistservices/getFile(DocumentInfoRecordDocType='${encodeURIComponent(element.DocumentInfoRecordDocType)}',DocumentInfoRecordDocNumber='${encodeURIComponent(element.DocumentInfoRecordDocNumber)}',DocumentInfoRecordDocPart='${encodeURIComponent(element.DocumentInfoRecordDocPart)}',DocumentInfoRecordDocVersion='${encodeURIComponent(element.DocumentInfoRecordDocVersion)}',LogicalDocument='${encodeURIComponent(element.LogicalDocument)}',ArchiveDocumentID='${encodeURIComponent(element.ArchiveDocumentID)}',LinkedSAPObjectKey='${encodeURIComponent(element.LinkedSAPObjectKey)}',BusinessObjectTypeName='${encodeURIComponent(element.BusinessObjectTypeName)}',MimeType='${encodeURIComponent(element.MimeType)}')/content`;

            var oReq = new XMLHttpRequest();
            oReq.open("GET", url, true);
            oReq.responseType = "arraybuffer";

            oReq.onload = function (oEvent) {
                var arrayBuffer = oReq.response; // Note: not oReq.responseText
                if (arrayBuffer) {
                    var byteArray = [];
                    for (let index = 0; index < arrayBuffer.byteLength; index += 512) {
                        let arraySlice = arrayBuffer.slice(index, index + 512);
                        byteArray.push(arraySlice);

                    }
                    // var byteArray = new Uint8Array(arrayBuffer);
                    var blob = new Blob(byteArray, { type: element.MimeType });
                    var url = URL.createObjectURL(blob);

                    // Crea un elemento di link temporaneo per il download
                    var downloadElement = document.createElement('a');
                    document.body.appendChild(downloadElement);
                    downloadElement.href = url;
                    downloadElement.download = element.FileName; // Nome del file da salvare
                    downloadElement.click(); // Simula un click per scaricare il file

                    // Pulisci rimuovendo l'elemento link e revocando l'URL del blob
                    document.body.removeChild(downloadElement);
                    URL.revokeObjectURL(url);

                }
            };

            oReq.send(null);

        },
        setStaffDistribution: async function (data) {

            return new Promise((resolve, reject) => {

                let url = `/odata/v4/staffinglistservices/createStaffDitr`;

                $.ajax({
                    type: "POST",
                    url: url,
                    contentType: 'application/json',
                    data: data,
                    success: function (sResult) {
                        resolve(sResult);
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        },
        formatMessageTimeshet: function (element, userTS) {

            let value = {
                additionalText: 'Timesheet exceeds planned ' + element.PersonFullName,
                message: 'Timesheet exceeds planned ' + element.PersonFullName,
                description: 'Employee Name: ' + element.PersonFullName + '\n Year: ' + userTS.Year + '\n Month: ' + userTS.Month + '\n Recorded Quantity: ' + userTS.Quantity / 8 + ' Day\n WorkPakage: ' + this.formatWBS(userTS.WorkPackage) + '\n WorkPakageID: ' + userTS.WorkPackage + '\n Activity Type: ' + this.FormatActivityType(userTS.ActivityType) + '\n\n ',
            }
            this.setMessage(value);
            this.formatButton()
        },
        chesk_po_before_save() {
            var that = globalThis.thatSchedaCommessa;
            var TreeTable = that.getView().getModel("TreeTable").getData().TreeTable;
            var chiusuraDate = new Date(globalThis.PeriodDate);

            for (let i = 0; i < TreeTable.length; i++) {
                const element = TreeTable[i];
                if (element.RelationshipCategory !== "") {
                    var ODA = this.getView().getModel("ODAExt").getData.filter(x => x.ServicePerformer === element.Person && chiusuraDate > new Date(x.PerformancePeriodEndDate));
                    if (!ODA || ODA.length < 0) {
                        let value = {
                            additionalText: 'Check purchase order',
                            message: 'External Empoloyee whitout Purchase Order',
                            description: 'Employee Name: ' + element.PersonFullName + '',
                        }
                        this.setMessage(value);
                        this.formatButton();
                    } else {
                        for (let j = 0; j < ODA.length; j++) {
                            const eODA = ODA[j];


                            if (this.getStaffingListByEmployee(element.PersonWorkAgreement, eODA.PerformancePeriodStartDate) > eODA.ScheduleLineOrderQuantity) {

                            }
                        }

                        ODA.sort((a, b) => { return new Date(a.PerformancePeriodStartDate) - new Date(b.PerformancePeriodStartDate) })
                    }
                }
            }
        },
        onSave: async function () {
            this.removeAllMessages();
            this._revenueDeltaWarningMessage = null;
            this._isRevenueDeltaPositive = false;
            this._revenueDeltaPopupShown = false;
            this._revenueDeltaWarningMessage = null;
            this._handleRevenueDeltaWarnings({ popup: true, log: true, force: true });
            this._pBusyDialog.then(async function (oBusyDialog) {
                oBusyDialog.open();
            });
            var that = globalThis.thatSchedaCommessa;
            var TreeTable = that.getView().getModel("TreeTable").oData.TreeTable;
            let Demands = that.getView().getModel('Demand').oData;
            let EmpList = that.getView().getModel('EmpList').oData;
            var date = that.getView().getModel('PeriodoContabile').oData;

            var Timesheet = that.getView().getModel('Timesheet').getData();

            var oModel = this.getView().getModel();
            /*
            let ResidualAmount = oModel.getProperty('/ResidualAmount');
            let workPackageBillingType = oModel.getProperty('/workPackageBillingType');

            if (workPackageBillingType === '2') {
                let eccesso = TreeTable[TreeTable.length - 1].TotalRevenue - ResidualAmount;
                if (eccesso > 0) {
                    let value = {};
                    value = {
                        additionalText: 'Planning exceeded billable',
                        message: 'Planning exceeded billable.',
                        description: 'You have exceeded the limit of ' + this.formatCurr(eccesso) + '\n\n Please, decrease forecast days',
                    }
                    this.setMessage(value);
                    this.formatButton();

                    sap.m.MessageBox.show("Planning exceeded billable.");
                    this._pBusyDialog.then(async function (oBusyDialog) {
                        oBusyDialog.close();
                    });
                    return;
                }
            }
            */
            let startMonth = 0;
            var newnMonth = 0;
            var Day = this.setCurrentDate(date.Date, globalThis.startDate);

            startMonth = Day.getMonth();
            newnMonth = this.monthDiff(Day, new Date(globalThis.endDate)) + new Date(Day).getMonth() - 1;

            let sArrayData = [];
            let batchRequests = [];

            var TeamTableFilterEd = this.adjustBeforeSave(TreeTable);

            //  for (let ind = minIndex; ind < TreeTable.length; ind++) {
            for (let ind = 0; ind < TeamTableFilterEd.length; ind++) {
                let element = TeamTableFilterEd[ind];
                let userTimesheet = Timesheet.filter(e => e.PersonWorkAgreement === element.PersonWorkAgreement && e.WBSElement === element.WorkPackage && e.ActivityType === element.ActivityType);
                if (element.ActivityType !== element.ServiceCostLevel) {
                    let demand = Demands.filter(e =>
                        e.PersonWorkAgreement === element.PersonWorkAgreement
                        && e.EngagementProjectResource === element.ActivityType
                        && e.WorkPackage === element.WorkPackage
                        && e.Version === '1'
                        && e.ResourceDemandStatus === "C"
                    );

                    if (demand.length === 0 || !demand) {
                        let requestUri = 'setStaffing';

                        let sElementDate = {
                            WorkPackage: element.WorkPackage,
                            Version: "1",
                            DeliveryOrganization: element.CompanyCode,
                            EngagementProjectResourceType: "0ACT",
                            EngagementProjectResource: element.ActivityType,
                            ResourceDemandStatus: "C",
                            UnitOfMeasure: "H",
                            PersonWorkAgreement: element.PersonWorkAgreement,
                            to_ResourceDemandDistribution: []
                        }

                        for (let i = startMonth; i <= newnMonth; i++) {

                            let obj = this.setPeriodYear(Day, i);
                            var period = obj.period,
                                year = obj.year,
                                tempMonth2 = new Date(year, period - 1),
                                tempMonth = new Date(new Date(year, period).setDate(0));

                            if (EmpList.find(e => e.PersonWorkAgreement === element.PersonWorkAgreement
                                && new Date(e.StartDate) <= tempMonth
                                && new Date(e.EndDate) >= tempMonth2)
                                && element[period + year] > 0) {
                                let distr = {
                                    CalendarMonth: period,
                                    CalendarYear: year,
                                    UnitOfMeasure: "H",
                                    Quantity: element[period + year] * 8,
                                    Currency: "EUR"
                                };
                                var periodPad = period.padStart(2, '0');
                                let userTS = userTimesheet.find(e => e.Year === year && e.Month === periodPad);
                                if (userTS && userTS.Quantity > distr.Quantity) {
                                    this.formatMessageTimeshet(element, userTS);
                                } else {
                                    sElementDate.to_ResourceDemandDistribution.push(distr);
                                }
                            }
                        }
                        if (sElementDate.to_ResourceDemandDistribution.length > 0) {

                            var batchRequest = {
                                requestUri: requestUri,
                                method: 'POST',
                                contentType: 'Content-Type: application/json',
                                data: sElementDate
                            };
                            batchRequests.push(batchRequest);
                        }

                    }
                    else {
                        let requestUri = 'StaffDitr';
                        for (let i = startMonth; i <= newnMonth; i++) {

                            let obj = this.setPeriodYear(Day, i);
                            var period = obj.period,
                                year = obj.year,
                                tempMonth2 = new Date(year, period - 1),
                                tempMonth = new Date(new Date(year, period).setDate(0));


                            if (EmpList.find(e => e.PersonWorkAgreement === element.PersonWorkAgreement
                                && new Date(e.StartDate) <= tempMonth
                                && new Date(e.EndDate) >= tempMonth2)

                            ) {

                                let allFilteredElements = demand.flatMap(demand => {
                                    // Filtriamo 'to_ResourceDemandDistribution' per ogni 'demand'
                                    return demand.to_ResourceDemandDistribution.filter(e =>
                                        e.CalendarMonth === period &&
                                        e.CalendarYear === year
                                    );
                                });

                                let totalQuantity = allFilteredElements.reduce((sum, current) => sumValues(sum, current.Quantity), 0);

                                if (totalQuantity !== element[period + year] * 8) {

                                    if (allFilteredElements.length > 1) {

                                        for (let index = 0; index < allFilteredElements.length; index++) {

                                            const filteredElement = allFilteredElements[index];

                                            if (index === 0) {
                                                let elementQuantity = element[period + year] * 8;

                                                let sElementDate = {
                                                    WorkPackage: element.WorkPackage,
                                                    Version: "1",
                                                    ResourceDemand: allFilteredElements[index].ResourceDemand,
                                                    CalendarMonth: period,
                                                    CalendarYear: year,
                                                    UnitOfMeasure: "H",
                                                    Quantity: elementQuantity,
                                                    Currency: "EUR"
                                                };
                                                var batchRequest = {
                                                    requestUri: requestUri,
                                                    method: 'POST',
                                                    contentType: 'Content-Type: application/json',
                                                    data: sElementDate
                                                };
                                                var periodPad = period.padStart(2, '0');

                                                let userTS = userTimesheet.find(e => e.Year === year && e.Month === periodPad);
                                                if (userTS && userTS.Quantity > sElementDate.Quantity) {
                                                    this.formatMessageTimeshet(element, userTS);
                                                } else {
                                                    batchRequests.push(batchRequest);
                                                }

                                            } else if (filteredElement.Quantity === 0) {
                                                continue;
                                            } else {
                                                let sElementDate = {
                                                    WorkPackage: element.WorkPackage,
                                                    Version: "1",
                                                    ResourceDemand: filteredElement.ResourceDemand,
                                                    CalendarMonth: period,
                                                    CalendarYear: year,
                                                    UnitOfMeasure: "H",
                                                    Quantity: 0,
                                                    Currency: "EUR"
                                                };
                                                var batchRequest = {
                                                    requestUri: requestUri,
                                                    method: 'POST',
                                                    contentType: 'Content-Type: application/json',
                                                    data: sElementDate
                                                };

                                                var periodPad = period.padStart(2, '0');

                                                let userTS = userTimesheet.find(e => e.Year === year && e.Month === periodPad);
                                                if (userTS && userTS.Quantity > sElementDate.Quantity) {
                                                    this.formatMessageTimeshet(element, userTS);
                                                } else {
                                                    batchRequests.push(batchRequest);
                                                }
                                            }
                                        }
                                    } else {
                                        let sElementDate = {};
                                        if (allFilteredElements.length === 1) {
                                            sElementDate = {
                                                WorkPackage: element.WorkPackage,
                                                Version: "1",
                                                ResourceDemand: allFilteredElements[0].ResourceDemand,
                                                CalendarMonth: period,
                                                CalendarYear: year,
                                                UnitOfMeasure: "H",
                                                Quantity: element[period + year] * 8,
                                                Currency: "EUR"
                                            };
                                        }
                                        else {
                                            sElementDate = {
                                                WorkPackage: element.WorkPackage,
                                                Version: "1",
                                                ResourceDemand: demand[0].ResourceDemand,
                                                CalendarMonth: period,
                                                CalendarYear: year,
                                                UnitOfMeasure: "H",
                                                Quantity: element[period + year] * 8,
                                                Currency: "EUR"
                                            };
                                        }
                                        var batchRequest = {
                                            requestUri: requestUri,
                                            method: 'POST',
                                            contentType: 'Content-Type: application/json',
                                            data: sElementDate
                                        };
                                        var periodPad = period.padStart(2, '0');
                                        let userTS = userTimesheet.find(e => e.Year === year && e.Month === periodPad);
                                        if (userTS && userTS.Quantity > sElementDate.Quantity) {
                                            this.formatMessageTimeshet(element, userTS);
                                        } else {
                                            batchRequests.push(batchRequest);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            if (batchRequests && batchRequests.length > 0) {
                let csrfToken = await that.getCSRFToken(`/odata/v4/staffinglistservices/`);
                Promise.all([that.batchPostRequest(batchRequests, csrfToken)])
                    .then(function () {
                        this.handleSuccessBatch(batchRequests);
                        this.ResetStaffingTable();
                    }.bind(this)
                    ).catch((error) => {
                        this.handleCatch(error, 'batch');
                        this._pBusyDialog.then(async function (oBusyDialog) {
                            oBusyDialog.close();
                        }.bind(this));
                    })
            } else {
                sap.m.MessageBox.show("Non sono presenti modifiche da salvare.");
                this._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.close();
                });
            }
        },

        ResetStaffingTable() {
            var oModel = this.getView().getModel("currentProjectModel").oData;
            var fiscalYear = this.getFiscalYear();
            Promise.all(
                [this.getDemand(),
                this.getRequestItem(oModel.Project.EngagementProject, fiscalYear.fiscalYear, fiscalYear.Period)]
            ).then(function () {
                this.populateStaffed();
                this._pBusyDialog.then(async function (oBusyDialog) {
                    this.sumCostoMaturato();
                    this.sumPrevistoFinire();
                    this.setEditabilityTableRows();
                    oBusyDialog.close();
                }.bind(this));
            }.bind(this)).catch((error) => {
                this.handleCatch(error, 'getRequestItem')
            });


        },

        addExpenese() {
            this.onAddExp();
        },
        onSaveSpese() {
            this._pBusyDialog.then(async function (oBusyDialog) {
                oBusyDialog.open();
            });
            var input = this.getView().byId("SpeseTrasferta");
            if (input.getValue() === "") {
                input.setValueState(sap.ui.core.ValueState.Error);
                return;
            } else { input.setValueState(sap.ui.core.ValueState.None); }
            var type = this.getView().byId('iExpensesType').getSelectedKey();
            if (type === "") {
                this.getView().byId('iExpensesType').setValueState(sap.ui.core.ValueState.Error);
                return;
            } else { this.getView().byId('iExpensesType').setValueState(sap.ui.core.ValueState.None); }
            var Expenses = this.getView().getModel().oData.Expenses;
            let value = 0;
            if (Expenses && Expenses.length > 0) {
                let Exp = Expenses.find(e => e.EngagementProjectResource === type && e.sum > '0');

                if (Exp) {
                    //value = parseInt(Exp.sum) + parseInt(input.getValue());
                    value = input.getValue();
                    Promise.all([this.setPatchExpense(value, type, Exp["WorkPackage"])]).then(
                        function () {
                            this.refreshExpenses();
                            this._pBusyDialog.then(async function (oBusyDialog) {
                                oBusyDialog.close();
                            });
                            this._expDialog.then(function (oDialog) {
                                oDialog.close();
                                oDialog.destroy();
                            })
                            this._expDialog = null;
                        }.bind(this)
                    ).catch((error) => {
                        this._pBusyDialog.then(async function (oBusyDialog) {
                            oBusyDialog.close();
                        });
                        this.handleCatch(error, 'RefeshExpenses')
                    });
                } else {
                    value = input.getValue();
                    Promise.all([this.setPostExpense(value, type)]).then(
                        function () {
                            this.refreshExpenses();
                            this._pBusyDialog.then(async function (oBusyDialog) {
                                oBusyDialog.close();
                            });
                            this._expDialog.then(function (oDialog) {
                                oDialog.close();
                                oDialog.destroy();
                            })

                            this._expDialog = null;
                        }.bind(this)

                    ).catch((error) => {
                        this._pBusyDialog.then(async function (oBusyDialog) {
                            oBusyDialog.close();
                        });
                        this.handleCatch(error, 'RefreshExpenses')
                    });

                };

                //SETTARE A VUOTO I CAMPI DI INPUT
                input.setValue("");
                this.getView().byId('iExpensesType').setValue("");
            }
        },
        setMessageAccomodationRes(e) {

            this.handleCatch(e, "Add Accomodation")
        },

        setMessageAccomodation(e) {
            this.handleCatch(e, "Add Accomodation")
        },

        async refreshExpenses() {
            Promise.all([this.getExpense()]).then(function () {
                this.setExpensesTable();
                this.sumPrevistoFinire();
                this.ExcudeEmpByExpenses();
            }.bind(this)).catch((error) => { this.handleCatch(error, 'setExpensesTable') });

        },
        setPatchExpense: async function (value, ResourceId, WorkPackage) {

            var workPackage = this.getView().getModel('WorkPackage').getData();
            var Expenses = this.getView().getModel('Expense').getData();
            var EXP = Expenses.find(e => e.ResourceType === '0EXP');
            let csrfToken = await this.getCSRFToken(`/odata/v4/staffinglistservices/`);


            if (workPackage && workPackage.length > 0) {

                let WP_Sel = workPackage.find(e => e.WorkPackageID === EXP["WorkPackage"]);

                var body = {
                    ProjectID: WP_Sel.ProjectID,
                    WorkPackageID: WP_Sel.WorkPackageID,
                    WorkPackageName: WP_Sel.WorkPackageName,
                    ResType: "0EXP",
                    ResourceId: ResourceId,
                    Workitem: '',
                    DelvryServOrg: '',
                    ExpenseCost: `${value}`
                }
                var filter = `(ProjectID='${WP_Sel.ProjectID}',WorkPackageID='${WP_Sel.WorkPackageID}',WorkPackageName='${WP_Sel.WorkPackageName}',ResType='0EXP',ResourceId='${ResourceId}',Workitem='',DelvryServOrg='')`;

                return new Promise((resolve, reject) => {
                    var url = '/odata/v4/staffinglistservices/AddExpense' + filter;
                    $.ajax({
                        type: "PATCH",
                        url: url,
                        data: JSON.stringify(body),
                        contentType: 'application/json',
                        headers: { 'x-csrf-token': csrfToken },
                        success: function (sResult) {


                            let message = {
                                additionalText: 'Success',
                                message: 'Add Accomodation',
                                description: "Add Accomodation"
                            }
                            this.setMessageSucces(message);
                            this.formatButton();
                            resolve(sResult);
                        }.bind(this),
                        error: function (e) {

                            this.setMessageAccomodationRes(e)
                            reject(e);
                        }.bind(this)
                    });
                });
            }


        },
        setPostExpense: async function (value, ResourceId) {

            var workPackage = this.getView().getModel('WorkPackage').oData;
            let csrfToken = await this.getCSRFToken(`/odata/v4/staffinglistservices/`);

            if (workPackage && workPackage.length > 0) {
                var body = {
                    ProjectID: workPackage[0].ProjectID,
                    WorkPackageID: workPackage[0].WorkPackageID,
                    WorkPackageName: workPackage[0].WorkPackageName,
                    ResType: "0EXP",
                    ResourceId: ResourceId,
                    BillingControlCategory: "NON_BILL",
                    ExpenseCost: `${value}`
                }

                return new Promise((resolve, reject) => {
                    var url = '/odata/v4/staffinglistservices/AddExpense';
                    $.ajax({
                        type: "POST",
                        url: url,
                        data: JSON.stringify(body),
                        headers: { 'x-csrf-token': csrfToken },
                        contentType: 'application/json',
                        success: function (sResult) {


                            let message = {
                                additionalText: 'Success',
                                message: 'Add Accomodation',
                                description: "Add Accomodation"
                            }
                            this.setMessageSucces(message);
                            this.formatButton();
                            resolve(sResult);
                        }.bind(this),
                        error: function (e) {

                            this.setMessageAccomodationRes(e)
                            reject(e);
                        }.bind(this)
                    });
                });
            }

        },
        onChangeDataPicker(evt) {
            var that = globalThis.thatSchedaCommessa;
            let newDate = new Date(this.getDateValue());

            var oModel = that.getView().getModel();
            var endDate = new Date(oModel.oData.endDate);
            if (newDate - endDate > 0) {
                this.setValueState('Error');
                this.setValueStateText('');
                this.setDateValue(endDate);
            }
        },
        onDatePicketDialogPress: function () {
            var oModel = this.getView().getModel();
            var endDate = new Date(oModel.oData.endDate);
            if (!this.oDefaultDialogData) {

                var dataPicker = new DatePicker({
                    value: {
                        path: "/endDate",
                        type: "sap.ui.model.type.Date",
                        formatOptions: {
                            source: {
                                pattern: "yyyy-MM-dd"
                            }
                        }
                    }
                    , change: this.onChangeDataPicker
                });
                dataPicker.setMinDate((UI5Date.getInstance(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())))

                this.oDefaultDialogData = new Dialog({

                    title: "Cambio Data Fine Progetto",
                    content: dataPicker,
                    draggable: true,
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "OK",
                        press: function () {
                            var newEndDate = this.getView().getModel().oData.endDate;
                            var oEndDatePicker = this.getView().byId("endDateFilter");
                            oEndDatePicker.setValue(newEndDate);
                            dataPicker.setMinDate((UI5Date.getInstance(newEndDate.split('-')[0], newEndDate.split('-')[1] - 1, newEndDate.split('-')[2])))
                            oEndDatePicker.fireChange();
                            this.oDefaultDialogData.close();
                            this.oDefaultDialogData.destroy();
                            delete this.oDefaultDialogData;
                        }.bind(this)
                    }),
                    endButton: new Button({
                        text: "Close",
                        press: function () {
                            this.oDefaultDialogData.close();
                            this.oDefaultDialogData.destroy();

                            delete this.oDefaultDialogData;
                        }.bind(this)
                    })
                });

                // to get access to the controller's model
                this.getView().addDependent(this.oDefaultDialogData);
            }

            this.oDefaultDialogData.open();
        },
        onDefaultDialogPress: function () {
            if (!this.oDefaultDialog) {
                this.oDefaultDialog = new Dialog({
                    title: "already selected users",
                    content: new List({
                        items: {
                            path: "/EmpSelected",
                            template: new StandardListItem({
                                title: "{PersonFullName}",
                                counter: 0
                            })
                        }
                    }),
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "OK",
                        press: function () {
                            this.oDefaultDialog.close();
                        }.bind(this)
                    }),
                    endButton: new Button({
                        text: "Close",
                        press: function () {
                            this.oDefaultDialog.close();
                        }.bind(this)
                    })
                });

                // to get access to the controller's model
                this.getView().addDependent(this.oDefaultDialog);
            }

            this.oDefaultDialog.open();
        },

        setEmpCost: function (StaffingRaw, Emp, CostRate, orgID, TimeSheetOvertimeCategory) {
            let OvertimeCategory = '';
            if (TimeSheetOvertimeCategory) {
                OvertimeCategory = TimeSheetOvertimeCategory;
            }
            StaffingRaw.TimeSheetOvertimeCategory = OvertimeCategory;
            StaffingRaw.PersonFullName = Emp.PersonFullName;//+ "-" + Emp.CompanyCode;
            StaffingRaw.ServiceCostLevel = Emp.ServiceCostLevel;
            if (Emp.CompanyCode === orgID) {
                let cost = CostRate.find(c => c.ServiceCostLevel === Emp.ServiceCostLevel
                    && c.CompanyCode === Emp.CompanyCode
                    && c.IsIntercompanyRate === false
                    && c.TimeSheetOvertimeCategory === OvertimeCategory);
                if (cost) {
                    StaffingRaw.CostRateVarblAmount = multiplyValues(cost.CostRateVarblAmount, 8);
                }
            } else {
                let cost = CostRate.find(c => c.ServiceCostLevel === Emp.ServiceCostLevel
                    && c.CompanyCode === Emp.CompanyCode
                    && c.IsIntercompanyRate === true
                    && c.TimeSheetOvertimeCategory === OvertimeCategory);
                if (cost) {
                    StaffingRaw.CostRateVarblAmount = multiplyValues(cost.CostRateVarblAmount, 8);
                }
            }
            StaffingRaw.CompanyCode = Emp.CompanyCode;
            StaffingRaw.EndDate = Emp.EndDate;
            StaffingRaw.StartDate = Emp.StartDate;
            //Valore di default Regural hours
            //campi non visualizzati
            StaffingRaw['PersonWorkAgreement'] = Emp.PersonWorkAgreement;
            StaffingRaw["RelationshipCategory"] = Emp.RelationshipCategory;
            StaffingRaw["Person"] = Emp.Person;
            StaffingRaw["WorkAssignmentBusinessPartner"] = Emp.WorkAssignmentBusinessPartner;
        },
        setMaturatobyOvetime(maturato, overtime) {
            var matuaratiByOverTime = [];
            overtime.forEach((over) => {
                let matuaratoByOverTime =
                {
                    ...over,
                    relTimesheet: maturato.filter((e) => e.TimeSheetOvertimeCategory === over.TimeSheetOvertimeCategory)
                }
                matuaratiByOverTime.push(matuaratoByOverTime);
            });
            return matuaratiByOverTime;
        },
        getStaffingDate(FiscalPeriod, FiscalYear) {
            let currentDate = new Date();
            currentDate.setDate(1);
            currentDate.setFullYear(FiscalYear);
            currentDate.setMonth(FiscalPeriod);
            currentDate.setDate(0);

            return currentDate;
        },
        TSMaturatosorterFunction(a, b) {
            let value = a.PersonnelNumber - b.PersonnelNumber;
            if (value !== 0) {
                return value;
            } if (a.WorkPackage > b.WorkPackage) {
                return 1;
            } if (a.WorkPackage < b.WorkPackage) {
                return -1;
            } if (a.PartnerCostCtrActivityType > b.PartnerCostCtrActivityType) {
                return 1;
            } if (a.PartnerCostCtrActivityType < b.PartnerCostCtrActivityType) {
                return -1;
            } if (new Date(a.DocumentDate) > new Date(b.DocumentDate)) {
                return 1;
            } if (new Date(a.DocumentDate) < new Date(b.DocumentDate)) {
                return -1;
            }
            return 0;
        },
        populateStaffed() {
            var that = globalThis.thatSchedaCommessa;
            var StaffingTable = [];
            try {
                var StaffingList = that.getView().getModel("StaffingList").oData;
            } catch (error) {

            }

            var TrasfertaMaturato = that.getView().getModel("TrasfertaMaturato").getData();
            var EmpList = that.getView().getModel("EmpList").oData;
            var CostRate = that.getView().getModel("CostRate").oData;
            var TSMaturatoAll = that.getView().getModel("TSMaturato").oData;
            var orgId = that.getView().getModel("currentProjectModel").oData.orgId;
            var ActivityTypeWP = that.getView().getModel("ActivityTypeWP").oData;
            var WorkPackage = that.getView().getModel("WorkPackage").oData;
            var dummy = that.getView().getModel("Dummy").oData;
            var overTimeCategory = that.getView().getModel('overTimeCategory').oData;
            var MaturatiAllByOverTime = that.setMaturatobyOvetime(TSMaturatoAll, overTimeCategory);

            var TSMaturato = MaturatiAllByOverTime.find(m => m.TimeSheetOvertimeCategory === 'Z010').relTimesheet;

            TSMaturato.sort(this.TSMaturatosorterFunction);

            for (let i = 0; i < StaffingList.length; i++) {
                //Prendo mese anno staffing -> ritorna data al 15
                let StaffingRaw = that.getStaffingRaw('StaffingTable', globalThis.monthNumber, globalThis.startDate);
                that.setStaffingRawZero(StaffingRaw);
                let currentDate = that.getStaffingDate(StaffingList[i].FiscalPeriod, StaffingList[i].FiscalYear);
                let currentDate2 = new Date(new Date(currentDate).setDate(0));
                //Cerco Full Name e Cost level 
                let Emp = EmpList.find(e => e.PersonWorkAgreement === StaffingList[i].EmploymentInternalID && new Date(e.StartDate) < currentDate && new Date(e.EndDate) > currentDate2)

                if (!Emp) {
                    if (dummy.find(e => e.Employee === StaffingList[i].EmploymentInternalID)) {
                        continue;
                    }
                    StaffingRaw.PersonFullName = StaffingList[i].EmploymentInternalID;
                    StaffingRaw.ServiceCostLevel = StaffingList[i].ActivityType,
                        StaffingRaw.StartDate = "2000-01-01";
                    StaffingRaw.EndDate = "9999-12-31";
                    Emp = {
                        PersonWorkAgreement: StaffingList[i].EmploymentInternalID,
                        ServiceCostLevel: StaffingList[i].ActivityType,
                        StartDate: "2000-01-01",
                        EndDate: "9999-12-31"
                    }
                    let cost = CostRate.find(c => c.ActivityType === StaffingList[i].ActivityType && c.CompanyCode === StaffingList[i].CompanyCode && c.IsIntercompanyRate === false);
                    StaffingRaw.CostRateVarblAmount = multiplyValues(cost.CostRateVarblAmount, 8);
                } else {
                    that.setEmpCost(StaffingRaw, Emp, CostRate, orgId, StaffingList[i].ActivityType === 'T008' ? 'Z011' : 'Z010')
                }

                StaffingRaw.ActivityType = StaffingList[i].ActivityType;
                StaffingRaw.WorkPackage = StaffingList[i].WorkPackage;
                StaffingRaw = this.setWorkPackage(StaffingRaw, WorkPackage);
                if (!this._isWorkPackageAllowed(StaffingRaw.WorkPackage)) {
                    continue;
                }

                //Controllo che: non ho sforato l'array, l'employee sia sempre lo stesso, l'employee non abbia cambiato Costo 
                while (i < StaffingList.length
                    && Emp.PersonWorkAgreement === StaffingList[i].EmploymentInternalID
                    && StaffingRaw.ActivityType === StaffingList[i].ActivityType
                    && StaffingRaw.WorkPackage === StaffingList[i].WorkPackage
                    && new Date(Emp.StartDate) < currentDate
                    && new Date(Emp.EndDate) > currentDate2) {


                    let period = currentDate.getMonth() + 1;
                    let year = currentDate.getFullYear();
                    var periodKey = period.toString() + year.toString();
                    addTo(StaffingRaw, periodKey, StaffingList[i].PlndEffortQty / 8);
                    addTo(StaffingRaw, "GiorniPrevisto", StaffingList[i].PlndEffortQty / 8);

                    i += 1;
                    if (i < StaffingList.length) {
                        currentDate = that.getStaffingDate(StaffingList[i].FiscalPeriod, StaffingList[i].FiscalYear);
                        currentDate2 = new Date(new Date(currentDate).setDate(0));
                    }
                }
                StaffingRaw.CostiPrevisto = multiplyValues(StaffingRaw.GiorniPrevisto, StaffingRaw.CostRateVarblAmount);

                let TSMaturatoEmp = TSMaturato.filter(e => e.PersonnelNumber === Emp.PersonWorkAgreement
                    && e.PartnerCostCtrActivityType === StaffingRaw.ActivityType
                    && e.WorkPackage === StaffingRaw.WorkPackage
                    && new Date(Emp.StartDate) <= new Date(e.DocumentDate)
                    && new Date(Emp.EndDate) >= new Date(e.DocumentDate));


                if (TSMaturatoEmp.length > 0) {
                    TSMaturatoEmp.forEach((element) => {
                        if (new Date(Emp.StartDate) <= new Date(element.DocumentDate)
                            && new Date(Emp.EndDate) >= new Date(element.DocumentDate)) {
                            let MaturatoDate = new Date(element.DocumentDate);
                            let period = MaturatoDate.getMonth() + 1;
                            let year = MaturatoDate.getFullYear();
                            var maturatoKey = period.toString() + year.toString();
                            addTo(StaffingRaw, maturatoKey, element.Quantity / 8);
                            addTo(StaffingRaw, "GiorniMaturato", element.Quantity / 8);
                            addTo(StaffingRaw, "CostiMaturato", element.AmountInTransactionCurrency);
                        }
                    })

                    StaffingRaw.WorkPackage = TSMaturatoEmp[0].WorkPackage;
                    StaffingRaw.ActivityType === TSMaturatoEmp[0].PartnerCostCtrActivityType
                    //  StaffingRaw.GiorniMaturato = normalizeNumber(StaffingRaw.GiorniMaturato) / 8;
                }
                StaffingRaw.Revenue = ActivityTypeWP.find(e => e.ActivityType === StaffingRaw.ActivityType) ? ActivityTypeWP.find(e => e.ActivityType === StaffingRaw.ActivityType).Revenue : '0';

                StaffingRaw.TotalRevenue = multiplyValues(StaffingRaw.GiorniPrevisto, StaffingRaw.Revenue);
                StaffingRaw.RevenueALL = multiplyValues(sumValues(StaffingRaw.GiorniPrevisto, StaffingRaw.GiorniMaturato), StaffingRaw.Revenue);

                StaffingTable.push(JSON.parse(JSON.stringify(StaffingRaw)));
                i -= 1;
            }
            for (let k = 0; k < TSMaturato.length; k++) {
                let Emp = EmpList.find(e => e.PersonWorkAgreement === TSMaturato[k].PersonnelNumber
                    && new Date(e.StartDate) <= new Date(TSMaturato[k].DocumentDate)
                    && new Date(e.EndDate) >= new Date(TSMaturato[k].DocumentDate))
                let StaffingRaw = that.getStaffingRaw('StaffingTable', globalThis.monthNumber, globalThis.startDate);
                that.setStaffingRawZero(StaffingRaw);
                if (Emp) {
                    let SEle = StaffingTable.find(e => e.PersonWorkAgreement === Emp.PersonWorkAgreement
                        && e.ActivityType === TSMaturato[k].PartnerCostCtrActivityType
                        && e.WorkPackage === TSMaturato[k].WorkPackage
                        && e.ServiceCostLevel === Emp.ServiceCostLevel);

                    if (SEle) {
                        while (k < TSMaturato.length
                            && TSMaturato[k].PersonnelNumber === SEle.PersonWorkAgreement
                            && SEle.ActivityType === TSMaturato[k].PartnerCostCtrActivityType
                            && SEle.ServiceCostLevel === Emp.ServiceCostLevel
                            && SEle.WorkPackage === TSMaturato[k].WorkPackage) {
                            k += 1;
                        }
                        k -= 1;
                        continue;
                    }
                    else {
                        that.setEmpCost(StaffingRaw, Emp, CostRate, orgId, TSMaturato[k].PartnerCostCtrActivityType === 'T008' ? 'Z011' : 'Z010');
                    }
                } else {
                    if (dummy.find(e => e.Employee === TSMaturato[k].PersonnelNumber)) {
                        continue;
                    }
                    StaffingRaw.PersonFullName = TSMaturato[k].PersonnelNumber;
                    StaffingRaw.PersonWorkAgreement = TSMaturato[k].PersonnelNumber;
                    StaffingRaw.ServiceCostLevel = TSMaturato[k].PartnerCostCtrActivityType,
                        StaffingRaw.StartDate = "2000-01-01";
                    StaffingRaw.EndDate = "9999-12-31";
                    Emp = {
                        PersonWorkAgreement: TSMaturato[k].PersonnelNumber,
                        ServiceCostLevel: TSMaturato[k].PartnerCostCtrActivityType,
                        StartDate: "2000-01-01",
                        EndDate: "9999-12-31"
                    }

                    let cost = CostRate.find(c => c.ActivityType === TSMaturato[k].PartnerCostCtrActivityType
                        && c.CompanyCode === orgId
                        && c.IsIntercompanyRate === false
                        && c.TimeSheetOvertimeCategory === '');
                    StaffingRaw.CostRateVarblAmount = multiplyValues(cost.CostRateVarblAmount, 8);

                    let SEle = StaffingTable.find(e => e.PersonFullName === Emp.PersonWorkAgreement
                        && e.ActivityType === TSMaturato[k].PartnerCostCtrActivityType
                        && e.ServiceCostLevel === TSMaturato[k].PartnerCostCtrActivityType);

                    if (SEle) {
                        while (k < TSMaturato.length
                            && TSMaturato[k].PersonnelNumber === SEle.PersonFullName
                            && SEle.ActivityType === TSMaturato[k].PartnerCostCtrActivityType
                            && SEle.ServiceCostLevel === Emp.ServiceCostLevel) {
                            k += 1;
                        }
                        k -= 1;
                        continue;
                    }
                }

                StaffingRaw.ActivityType = TSMaturato[k].PartnerCostCtrActivityType;
                StaffingRaw.WorkPackage = TSMaturato[k].WorkPackage;
                StaffingRaw = this.setWorkPackage(StaffingRaw, WorkPackage);
                if (!this._isWorkPackageAllowed(StaffingRaw.WorkPackage)) {
                    continue;
                }

                while (k < TSMaturato.length
                    && TSMaturato[k].PersonnelNumber === StaffingRaw.PersonWorkAgreement
                    && StaffingRaw.ActivityType === TSMaturato[k].PartnerCostCtrActivityType
                    && StaffingRaw.WorkPackage === TSMaturato[k].WorkPackage
                    && new Date(Emp.StartDate) <= new Date(TSMaturato[k].DocumentDate)
                    && new Date(Emp.EndDate) >= new Date(TSMaturato[k].DocumentDate)) {
                    let MaturatoDate = new Date(TSMaturato[k].DocumentDate);
                    let period = MaturatoDate.getMonth() + 1;
                    let year = MaturatoDate.getFullYear();
                    var periodKey = period.toString() + year.toString();
                    addTo(StaffingRaw, periodKey, TSMaturato[k].Quantity / 8);
                    addTo(StaffingRaw, "GiorniMaturato", TSMaturato[k].Quantity);
                    addTo(StaffingRaw, "CostiMaturato", TSMaturato[k].AmountInTransactionCurrency);
                    k += 1;
                }
                StaffingRaw.GiorniMaturato = normalizeNumber(StaffingRaw.GiorniMaturato) / 8;
                StaffingRaw.Revenue = ActivityTypeWP.find(e => e.ActivityType === StaffingRaw.ActivityType) ? ActivityTypeWP.find(e => e.ActivityType === StaffingRaw.ActivityType).Revenue : '0';
                k--;
                StaffingTable.push(JSON.parse(JSON.stringify(StaffingRaw)));

            }
            let maturato = this.setStaffingTableByOverTime(MaturatiAllByOverTime, EmpList, ActivityTypeWP, CostRate, orgId, dummy, WorkPackage);
            let maturatoDuty = maturato.filter((m, index, arr) => {
                if (m.TimeSheetOvertimeCategory === 'Z011') {
                    arr.splice(index, 1);
                    return true
                }
                else {
                    return false
                }
            });
            let StaffingDuty = StaffingTable.filter((m, index, arr) => {
                if (m.TimeSheetOvertimeCategory === 'Z011') {
                    arr.splice(index, 1);
                    return true
                }
                else {
                    return false
                }
            });


            var matOnCall = this.mergeOnCallDuty(StaffingDuty, maturatoDuty);
            StaffingTable = maturato.concat(StaffingTable, matOnCall);

            StaffingTable = StaffingTable.filter(e => e.CostiMaturato !== 0 || e.CostiPrevisto !== 0);
            if (TrasfertaMaturato && TrasfertaMaturato.length > 0) {
                TrasfertaMaturato.sort((a, b) => {
                    if (a.Supplier > b.Supplier) {
                        return 1;
                    }
                    if (a.Supplier < b.Supplier) {
                        return -1;
                    }
                    return 0
                });
                TrasfertaMaturato.forEach((trasferta) => {
                    let staffedInd = StaffingTable.findIndex(s => s.WorkAssignmentBusinessPartner === trasferta.Supplier
                        && s.TimeSheetOvertimeCategory === 'Z010'
                        && s.WorkPackage === trasferta.WorkPackage)
                    if (staffedInd >= 0) {
                        addTo(StaffingTable[staffedInd], "TrasfertaMaturato", trasferta.AmountInTransactionCurrency);
                    } else {
                        if (!this._isWorkPackageAllowed(trasferta.WorkPackage)) {
                            return;
                        }
                        let StaffingRaw = that.getStaffingRaw('StaffingTable', globalThis.monthNumber, globalThis.startDate);
                        that.setStaffingRawZero(StaffingRaw);
                        let Emp = EmpList.find(e => e.WorkAssignmentBusinessPartner === trasferta.Supplier);
                        if (Emp) {
                            that.setEmpCost(StaffingRaw, Emp, CostRate, orgId, 'Z010');
                        }
                        else {
                            StaffingRaw.TimeSheetOvertimeCategory = 'Z010';
                            StaffingRaw["PersonFullName"] = trasferta.SupplierName;
                            StaffingRaw["WorkAssignmentBusinessPartner"] = trasferta.Supplier;
                        }
                        StaffingRaw.WorkPackage = trasferta.WorkPackage;
                        StaffingRaw.WPEndDate = "2000-01-01T00:00:00Z"
                        StaffingRaw.WPStartDate = "2000-01-01T00:00:00Z"
                        StaffingRaw.ActivityType = null;
                        addTo(StaffingRaw, "TrasfertaMaturato", trasferta.AmountInTransactionCurrency);
                        StaffingTable.push(StaffingRaw);
                    };
                });
            }
            for (let i = 0; i < StaffingTable.length; i++) {
                if (StaffingTable[i].CostRateVarblAmount === 'Cost STD') {
                    var giorni = normalizeNumber(StaffingTable[i].GiorniMaturato);
                    if (giorni !== 0) {
                        StaffingTable[i].CostRateVarblAmount = normalizeNumber(StaffingTable[i].CostiMaturato) / giorni;
                    } else {
                        StaffingTable[i].CostRateVarblAmount = 0;
                    }
                }
            }
            StaffingTable.sort(this.sortStaffingTable)
            StaffingTable.push(that.setLastValue(StaffingTable));
            this.getView().byId("idTable").setVisibleRowCount(StaffingTable.length);
            const oModelS = new sap.ui.model.json.JSONModel();
            oModelS.setData({ TreeTable: StaffingTable });
            that.setModel(oModelS, "TreeTable");

            return StaffingTable;
        },
        mergeOnCallDuty(StaffingDuty, MaturatoDuty) {
            var returnedArr = [];
            var Staffing = MaturatoDuty.concat(StaffingDuty);
            Staffing.sort(this.sortStaffingTable)
            if (Staffing.length === 0) {
                return []
            }
            for (let i = 0; i < Staffing.length - 1; i++) {
                if (Staffing[i].PersonFullName === Staffing[i + 1].PersonFullName
                    && Staffing[i].WorkPackage === Staffing[i + 1].WorkPackage) {
                    for (const property in Staffing[i]) {
                        Staffing[i + 1][property] = sumValues(Staffing[i + 1][property], Staffing[i][property]);
                    }
                    Staffing[i + 1].PersonWorkAgreement = Staffing[i].PersonWorkAgreement;
                    Staffing[i + 1].WorkPackage = Staffing[i].WorkPackage;
                    Staffing[i + 1].ActivityType = Staffing[i].ActivityType;
                    Staffing[i + 1].CompanyCode = Staffing[i].CompanyCode;
                    Staffing[i + 1].PersonFullName = Staffing[i].PersonFullName;
                    Staffing[i + 1].ServiceCostLevel = Staffing[i].ServiceCostLevel;
                    Staffing[i + 1].CostRateVarblAmount = Staffing[i].CostRateVarblAmount;
                    Staffing[i + 1].TimeSheetOvertimeCategory = Staffing[i].TimeSheetOvertimeCategory;
                    Staffing[i + 1].EndDate = Staffing[i].EndDate;
                    Staffing[i + 1].StartDate = Staffing[i].StartDate;
                    Staffing[i + 1].WPEndDate = Staffing[i].WPEndDate;
                    Staffing[i + 1].WPStartDate = Staffing[i].WPStartDate;
                    //Staffing[i + 1].WPType = Staffing[i].WPType;
                    Staffing[i + 1].Revenue = Staffing[i].Revenue;
                    Staffing[i + 1].Person = Staffing[i].Person;

                }
                else { returnedArr.push(Staffing[i]) }
            }
            returnedArr.push(Staffing[Staffing.length - 1])
            return returnedArr;

        },
        sortStaffingTable(a, b) {
            if (a.WorkPackage > b.WorkPackage) {
                return 1;
            }
            if (a.WorkPackage < b.WorkPackage) {
                return -1;
            }
            if (a.PersonFullName > b.PersonFullName) {
                return 1;
            }
            if (a.PersonFullName < b.PersonFullName) {
                return -1;
            }
            return 0;
        },
        setWorkPackage(StaffingRaw, WorkPackage) {
            let WorkP = WorkPackage.find(wp => wp.WorkPackageID === StaffingRaw.WorkPackage);
            //let workPackageBillingType = this.getView().getModel('workPackageBillingType').getData();
            if (WorkP) {
                StaffingRaw.WPStartDate = WorkP.WPStartDate;
                StaffingRaw.WPEndDate = WorkP.WPEndDate;
                //  StaffingRaw.WPType =  workPackageBillingType.find(wp => wp.WorkPackage === StaffingRaw.WorkPackage).BillingPlanUsageCategory;

            }
            return StaffingRaw;
        },
        _isWorkPackageAllowed: function (workPackageId) {
            if (!workPackageId) {
                return true;
            }
            if (!this._allowedWorkPackages || this._allowedWorkPackages.size === 0) {
                return true;
            }
            return this._allowedWorkPackages.has(workPackageId);
        },
        setStaffingTableByOverTime(MaturatiAllByOverTime, EmpList, ActivityTypeWP, CostRate, orgId, dummy, WorkPackage) {

            let pushed = [];
            for (let i = 0; i < MaturatiAllByOverTime.length; i++) {
                if (MaturatiAllByOverTime[i].TimeSheetOvertimeCategory === 'Z010') {
                    continue;
                }
                let TSMaturato = MaturatiAllByOverTime[i].relTimesheet;
                TSMaturato.sort(this.TSMaturatosorterFunction);
                for (let k = 0; k < TSMaturato.length; k++) {
                    let StaffingRaw = this.getStaffingRaw('StaffingTable', globalThis.monthNumber, globalThis.startDate);
                    this.setStaffingRawZero(StaffingRaw);

                    let Emp = EmpList.find(e => e.PersonWorkAgreement === TSMaturato[k].PersonnelNumber
                        && new Date(e.StartDate) <= new Date(TSMaturato[k].DocumentDate)
                        && new Date(e.EndDate) >= new Date(TSMaturato[k].DocumentDate))
                    if (Emp) {
                        this.setEmpCost(StaffingRaw, Emp, CostRate, orgId, MaturatiAllByOverTime[i].TimeSheetOvertimeCategory);
                    } else {
                        if (dummy.find(e => e.Employee === TSMaturato[k].PersonnelNumber)) {
                            continue;
                        }
                        StaffingRaw.PersonFullName = TSMaturato[k].PersonnelNumber;
                        StaffingRaw.PersonWorkAgreement = TSMaturato[k].PersonnelNumber;
                        StaffingRaw.ServiceCostLevel = TSMaturato[k].PartnerCostCtrActivityType,
                            StaffingRaw.StartDate = "2000-01-01";
                        StaffingRaw.EndDate = "9999-12-31";
                        Emp = {
                            PersonWorkAgreement: TSMaturato[k].PersonnelNumber,
                            ServiceCostLevel: TSMaturato[k].PartnerCostCtrActivityType,
                            StartDate: "2000-01-01",
                            EndDate: "9999-12-31"
                        }

                        let cost = CostRate.find(c => c.ActivityType === TSMaturato[k].PartnerCostCtrActivityType
                            && c.CompanyCode === orgId
                            && c.IsIntercompanyRate === false
                            && c.TimeSheetOvertimeCategory === "");//MaturatiAllByOverTime[i].TimeSheetOvertimeCategory);
                        StaffingRaw.CostRateVarblAmount = multiplyValues(cost.CostRateVarblAmount, 8);
                    }

                    StaffingRaw.ActivityType = TSMaturato[k].PartnerCostCtrActivityType;
                    StaffingRaw.WorkPackage = TSMaturato[k].WorkPackage;
                    StaffingRaw = this.setWorkPackage(StaffingRaw, WorkPackage);

                    while (k < TSMaturato.length
                        && TSMaturato[k].PersonnelNumber === StaffingRaw.PersonWorkAgreement
                        && StaffingRaw.ActivityType === TSMaturato[k].PartnerCostCtrActivityType
                        && StaffingRaw.WorkPackage === TSMaturato[k].WorkPackage
                        && new Date(Emp.StartDate) <= new Date(TSMaturato[k].DocumentDate)
                        && new Date(Emp.EndDate) >= new Date(TSMaturato[k].DocumentDate)) {
                    let MaturatoDate = new Date(TSMaturato[k].DocumentDate);
                    let period = MaturatoDate.getMonth() + 1;
                    let year = MaturatoDate.getFullYear();
                    var overtimeKey = period.toString() + year.toString();
                    addTo(StaffingRaw, overtimeKey, TSMaturato[k].Quantity / 8);
                    addTo(StaffingRaw, "GiorniMaturato", TSMaturato[k].Quantity);
                    addTo(StaffingRaw, "CostiMaturato", TSMaturato[k].AmountInTransactionCurrency);
                    k += 1;
                }
                    if (MaturatiAllByOverTime[i].TimeSheetOvertimeCategory === 'Z011') {
                        StaffingRaw.ActivityType = 'T008';
                    }
                    StaffingRaw.GiorniMaturato = normalizeNumber(StaffingRaw.GiorniMaturato) / 8;
                    StaffingRaw.Revenue = ActivityTypeWP.find(e => e.ActivityType === StaffingRaw.ActivityType) ? ActivityTypeWP.find(e => e.ActivityType === StaffingRaw.ActivityType).Revenue : '0';
                    k--;
                    if (StaffingRaw.GiorniMaturato !== 0) {
                        pushed.push(JSON.parse(JSON.stringify(StaffingRaw)));
                    }
                }
            }
            return pushed;
        },
        getFiscalYear: function () {

            var that = globalThis.thatSchedaCommessa;
            var date = that.getView().getModel('PeriodoContabile').oData;
            if (!date.Date) {
                var Day = new Date(null);
            }
            else {
                var Day = new Date(date.Date);
            }
            var fiscalYear = Day.getFullYear().toString().padStart(4, '0');
            var Period = (Day.getMonth() + 1).toString().padStart(3, '0');

            return {
                fiscalYear: fiscalYear,
                Period: Period
            }
        },
        adjustBeforeSave(treeTable) {

            var Temp = [];
            var elements = [];

            for (let i = 0; i < treeTable.length - 1; i++) {
                if (treeTable[i].TimeSheetOvertimeCategory === 'Z010' || treeTable[i].TimeSheetOvertimeCategory === 'Z011') {
                    Temp.push(treeTable[i])
                }
            }
            if (Temp && Temp.length > 0) {

                var noDuplicates = this.removeDuplicateBy(Temp,
                    x => x.PersonWorkAgreement + x.ActivityType + x.WorkPackage,
                    function myFunction(x) {
                        return {
                            ActivityType: x.ActivityType,
                            PersonWorkAgreement: x.PersonWorkAgreement,
                            WorkPackage: x.WorkPackage,
                        };
                    });

                noDuplicates.forEach((noDuplicate) => {

                    let Duplicates = Temp.filter((e) =>
                        e.PersonWorkAgreement === noDuplicate.PersonWorkAgreement
                        && e.ActivityType === noDuplicate.ActivityType
                        && e.WorkPackage === noDuplicate.WorkPackage);
                    let element = this.getStaffingRaw('StaffingTable', globalThis.monthNumber, globalThis.startDate);
                    this.setStaffingRawZero(element);

                    if (Duplicates && Duplicates.length > 0) {

                        Duplicates.forEach((e) => {
                            for (const property in e) {
                                element[property] = sumValues(element[property], e[property]);
                            }
                        })

                        element.PersonWorkAgreement = Duplicates[0].PersonWorkAgreement;
                        element.WorkPackage = Duplicates[0].WorkPackage;
                        element.ActivityType = Duplicates[0].ActivityType;
                        element.CompanyCode = Duplicates[0].CompanyCode;
                        element.PersonFullName = Duplicates[0].PersonFullName;
                        element.ServiceCostLevel = '';
                        element.CostRateVarblAmount = '';
                        element.TimeSheetOvertimeCategory = '';
                        element.EndDate = '';
                        element.StartDate = '';
                        element.Revenue = '';
                        element.Person = '';
                        elements.push(element)
                    }
                })
            }
            return elements;
        },
        setLastValue(StaffingTable, ExcludeLast) {
            let last = 0;
            if (ExcludeLast) { last = 1 }

            let lastValue = this.getStaffingRaw('StaffingTable', globalThis.monthNumber, globalThis.startDate);
            this.setStaffingRawZero(lastValue);
            lastValue.TotalRevenue = 0;
            lastValue.RevenueALL = 0;
            for (let i = 0; i < StaffingTable.length - last; i++) {
                for (const property in lastValue) {
                    try {
                        lastValue[property] = sumValues(lastValue[property], StaffingTable[i][property]);
                    } catch (error) {

                    }
                }
            }
            lastValue.PersonFullName = '  - - - Total Sum - - -  ';
            lastValue.ServiceCostLevel = '';
            lastValue.CostRateVarblAmount = '';
            lastValue.TimeSheetOvertimeCategory = '';
            lastValue.CompanyCode = '';
            lastValue.EndDate = '';
            lastValue.StartDate = '';
            lastValue.ActivityType = '';
            lastValue.Revenue = 0;
            lastValue.WorkPackage = '';
            lastValue.WPStartDate = globalThis.startDate;
            lastValue.WPEndDate = globalThis.endDate;
            return lastValue;

        },
        setStaffingRawZero: function (StaffingRaw) {
            StaffingRaw.CostiMaturato = 0;
            StaffingRaw.CostiPrevisto = 0;
            StaffingRaw.TrasfertaMaturato = 0;
            StaffingRaw.TrasfertaPrevisto = 0;
            StaffingRaw.GiorniMaturato = 0;
            StaffingRaw.GiorniPrevisto = 0;
        },

        setTable2(StrName, oTable) {

            var obj = Constant[StrName];
            var aColumns = [];
            let i = 0;
            let headerSpan = 0;
            var multi = Constant['StaffingMultLab'];
            var formatter = Constant['formatter'];

            var visible = [];
            // Constant['visible'];
            if (this.getView().getModel().getProperty('/workPackageBillingType') === "2") {
                visible = Constant['visibleTM'];
            } else {
                visible = Constant['visible'];
            }
            var width = Constant['width'];
            var hAlign = Constant['hAlign'];
            for (const property in obj) {
                let path = "TreeTable>" + property + "";
                if (headerSpan <= 1) {
                    headerSpan = multi.filter(f => f === multi[i]).length;
                } else {
                    headerSpan--;
                }

                var oColumn = new Column({

                    /* label: new Text({ text: `${obj[property]}` }),*/
                    headerSpan: headerSpan,
                    multiLabels: [
                        new Text({ text: `${multi[i]}` }),
                        new Text({ text: `${obj[property]}` })
                    ],
                    width: width[i],
                    hAlign: hAlign[i],
                    visible: visible[i],
                    template: new Text({
                        text: {
                            path: path,
                            formatter: eval(formatter[i])
                        }
                    })
                });
                i += 1;
                aColumns.push(oColumn);
            }

            for (let i = 0; i < aColumns.length; i++) {
                const element = aColumns[i];

                // Aggiungi la colonna alla TreeTable
                oTable.addColumn(element);
            }


        },
        async sendPatchWP(url, Body) {

            let csrfToken = await this.getCSRFToken(`/odata/v4/staffinglistservices/`);

            return new Promise((resolve, reject) => {

                $.ajax({
                    type: "PATCH",
                    url: url,
                    contentType: 'application/json',
                    data: Body,
                    headers: { 'x-csrf-token': csrfToken },
                    success: function (sResult) {
                        resolve(sResult);
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });

            });
        },
        onchangeWPDate(endDate) {
            var Project = this.getView().getModel("currentProjectModel").oData.Project;
            var WorkPackage = this.getView().getModel("WorkPackage").oData;

            if (WorkPackage && WorkPackage.length > 0) {
                for (let i = 0; i < WorkPackage.length; i++) {
                    let keyPatch = `/odata/v4/staffinglistservices/WorkpackagePatch(ProjectID='${Project}',WorkPackageID='${WorkPackage.WorkPackageID}',WorkPackageName='${WorkPackage.WorkPackageName}')`;
                    let body = { WPEndDate: endDate };
                    Promise.all([this.sendPatchWP(keyPatch, body)]).then().bind(this);
                }
            }
        },
        setPianoContabile() {
            var billingplan = this.getView().getModel('billingplan').getData();
            var itemtext = this.getView().getModel('ItemText').getData();
            /*       
                    var workPackageBillingType = this.getView().getModel('workPackageBillingType').getData();
                    workPackageBillingType.find(wp => wp.WorkPackage === StaffingRaw.WorkPackage.BillingPlanUsageCategory);
            */
            billingplan.forEach(value => {
                try {
                    value['Offer'] = itemtext.find(e => e.SalesOrderItem.padStart(6, '0') === value.SalesOrderItem).LongText;
                    //value['WorkPackage'] = 
                } catch (error) {

                }
            })
            this.getView().getModel().setProperty('/billingplan', billingplan);
        },
        onOpenPurOrd() {
            var oModel = this.getView().getModel('TreeTable').oData;
            var model = this.getView().getModel();
            var otable = this.getView().byId('idTable');
            var index = otable.getSelectedIndex();
            if (index < 0 || index > oModel.TreeTable.length - 1) {
                MessageToast.show('Select an Employee');
                return;
            }

            try {
                var Staffed = oModel.TreeTable[index];
                var ODA = this.getView().getModel("ODAExt").oData.filter(x => x.ServicePerformer === Staffed.Person);
                model.setProperty('/ODAExt', ODA);
                if (Staffed.RelationshipCategory === "") {
                    sap.m.MessageToast.show("Error : Internal employees do not have purchase orders", {
                        duration: 3000
                    });
                } else {
                    this.handleTableSelectDialogPress(Staffed);
                }
            } catch (error) {
                this.handleCatch(error, 'onOpenPurOrd')
            }
        },
        onOpenConcur() {
            var oModel = this.getView().getModel('TreeTable').oData;
            var model = this.getView().getModel();
            var otable = this.getView().byId('idTable');
            var index = otable.getSelectedIndex();
            if (index < 0 || index > oModel.TreeTable.length - 1) {
                MessageToast.show('Select an Employee');
                return;
            }

            var TrasfertaMaturatoAll = this.getView().getModel("TrasfertaMaturato").getData();
            var Concur = [];

            if (TrasfertaMaturatoAll && TrasfertaMaturatoAll.length > 0) {
                var Staffed = oModel.TreeTable[index];
                Concur = TrasfertaMaturatoAll.filter(x => x.Supplier === Staffed.WorkAssignmentBusinessPartner && x.WorkPackage === Staffed.WorkPackage);

                for (let index = 0; index < Concur.length; index++) {
                    Concur[index]["PersonFullName"] = Staffed.PersonFullName;
                }

                model.setProperty('/TrasfertaMaturatoFragment', Concur);
                this.handleTableSelectDialogPressConcur(Staffed);

            } else {
                MessageToast.show('No Travel Expenses');
                return;
            }

        },
        async onDelRow() {

            this._pBusyDialog.then(async function (oBusyDialog) {
                oBusyDialog.open();
            });
            var oModel = this.getView().getModel('TreeTable').oData;
            var model = this.getView().getModel();

            var endDate = new Date(model.getData().endDate)
            var StartDate = this.getView().getModel('PeriodoContabile').getData().Date;

            var Demands = this.getView().getModel('Demand').getData();

            var otable = this.getView().byId('idTable');
            var index = otable.getSelectedIndex();
            var batchRequests = [];

            if (index < 0 || index > oModel.TreeTable.length - 1) {
                this._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.close();
                })
                MessageToast.show('Select an Employee');
                return;
            }

            try {
                var Staffed = oModel.TreeTable[index];
                var demand = [];
                let PersonWorkAgreement = Staffed.PersonWorkAgreement ? Staffed.PersonWorkAgreement : Staffed.PersonFullName;

                demand = Demands.filter((e) => {
                    return e.PersonWorkAgreement === PersonWorkAgreement &&
                        e.WorkPackage === Staffed.WorkPackage &&
                        e.ResourceDemandStatus === 'C' &&
                        e.EngagementProjectResource === Staffed.ActivityType &&
                        e.Version === '1'
                });
                demand.forEach((element) => {
                    element.to_ResourceDemandDistribution.forEach((distr) => {
                        if (distr.Quantity !== 0) {
                            let month = StartDate.getMonth() + 1;
                            let year = StartDate.getFullYear();
                            if (distr.CalendarYear > year.toString() || (Number(distr.CalendarYear) === year && distr.CalendarMonth >= Number(month))) {

                                let sElementDate = {
                                    WorkPackage: Staffed.WorkPackage,
                                    Version: distr.Version,
                                    ResourceDemand: element.ResourceDemand,
                                    CalendarMonth: distr.CalendarMonth,
                                    CalendarYear: distr.CalendarYear,
                                    UnitOfMeasure: "H",
                                    Quantity: 0,
                                    Currency: "EUR"
                                };
                                var batchRequest = {
                                    requestUri: 'StaffDitr',
                                    method: 'POST',
                                    contentType: 'Content-Type: application/json',
                                    data: sElementDate
                                };
                                batchRequests.push(batchRequest);
                            }
                        }
                    })
                })


                if (batchRequests && batchRequests.length > 0) {
                    let csrfToken = await this.getCSRFToken(`/odata/v4/staffinglistservices/`);
                    Promise.all([this.batchPostRequest(batchRequests, csrfToken)])
                        .then(function () {
                            this.handleSuccessBatch(batchRequests);
                            this.ResetStaffingTable();
                            this._pBusyDialog.then(async function (oBusyDialog) {
                                oBusyDialog.close();
                            })
                        }.bind(this)
                        ).catch((error) => {
                            this.handleCatch(error, 'batch');
                            this._pBusyDialog.then(async function (oBusyDialog) {
                                oBusyDialog.close();
                            }.bind(this));
                        })
                } else {

                    this.ResetStaffingTable();
                    this._pBusyDialog.then(async function (oBusyDialog) {
                        oBusyDialog.close();
                    })
                }

            } catch (error) {
                this.handleCatch(error, 'onDelRow')
            }
        },
        setLastRowBold(oTable) {
            oTable.attachUpdateFinished(function () {
                var items = this.getItems();
                if (items.length > 0) {
                    // Rimuovi la classe bold dalle altre righe se necessario
                    items.forEach(function (item) {
                        item.removeStyleClass('bold-row');
                    });
                    // Applica la classe bold all'ultima riga
                    items[items.length - 1].addStyleClass('bold-row');
                }
            });
        },
        setLast3RowBold(oTable) {
            oTable.attachUpdateFinished(function () {
                var items = this.getItems();
                if (items.length > 0) {
                    // Rimuovi la classe bold dalle altre righe se necessario
                    items.forEach(function (item) {
                        item.removeStyleClass('bold-row');
                    });
                    // Applica la classe bold all'ultima riga
                    items[items.length - 1].addStyleClass('bold-row');
                    items[items.length - 2].addStyleClass('bold-row');
                    items[items.length - 3].addStyleClass('bold-row');
                }
            });
        },
        setLastRowUnBold(oTable) {
            oTable.attachUpdateFinished(function () {
                var items = this.getItems();
                if (items.length > 0) {
                    // Rimuovi la classe bold dalle altre righe se necessario
                    items.forEach(function (item) {
                        item.removeStyleClass('bold-row');
                    });
                }
            });
        },
        setLastRowBoldTreeTable(otable) {
            var items = otable.getRows();
            if (items.length > 0) {
                // Rimuovi la classe bold dalle altre righe se necessario
                items.forEach(function (item) {
                    item.removeStyleClass('bold-row');
                });
                // Applica la classe bold all'ultima riga
                items[items.length - 1].addStyleClass('bold-row');
            }
        },
        mTableaddColumn(oTable, name) {
            var oWBSDescriptionColumn = new sap.m.Column({
                header: new sap.m.Label({
                    text: name
                })
            });
            oWBSDescriptionColumn.setDemandPopin(true);
            oWBSDescriptionColumn.setMinScreenWidth('Tablet');
            oTable.addColumn(oWBSDescriptionColumn);
        },
        setExpense() {
            var that = globalThis.thatSchedaCommessa;
            var oTable = that.getView().byId("idTable4");

            that.setLastRowBold(oTable);

            //Inizializzo la tabella
            oTable.removeAllColumns();
            oTable.removeAllItems();

            //* CREAZIONE STRUTTURA TABELLA DINAMICA */
            // Aggiungi colonne per la descrizione progetto
            that.mTableaddColumn(oTable, "Expenses Name");
            that.mTableaddColumn(oTable, "Estimated");
            that.mTableaddColumn(oTable, "Actuals");
            that.mTableaddColumn(oTable, "Purschase Orders");
            that.mTableaddColumn(oTable, "Supplier Invoices");


            //creo le righe
            var oTableRow = new sap.m.ColumnListItem({
                cells: [
                    new sap.m.Text({
                        text: {
                            path: "EngagementProjResourceText",
                            formatter: ""
                        }
                    }),


                    new sap.m.Text({
                        text: {
                            path: "sum",
                            formatter: this.formatCurr.bind(this)
                        }
                    }),
                    new sap.m.Text({
                        text: {
                            path: "actuals",
                            formatter: this.formatCurr.bind(this)
                        }
                    }),

                    new sap.m.Button({
                        text: {
                            path: "nOda",// "EngagementProjectResource"
                            //,
                            //formatter: that.refFormatter.bind(this)
                        },
                        //  icon: "sap-icon://expense-report",
                        press: this.handleTableSelectDialogPressExpense.bind(this),

                    }),
                    new sap.m.Button({
                        text: {

                            path: "nInv",// "EngagementProjectResource",
                            //formatter: that.refFormatter.bind(this)
                        },
                        // icon: "sap-icon://expense-report",
                        press: this.handleTableSelectDialogPressInvoice.bind(this),

                    }),

                ]
            });
            var oModel = that.getView().getModel();
            oTable.setModel(oModel);
            oTable.bindItems("/Expenses", oTableRow);
            // Aggiungi la riga alla tabella
            //oTable.addItem(oTableRow);

        },
        setStaffingTable(monthNumber, startDate) {
            var that = globalThis.thatSchedaCommessa;
            var oTable = that.getView().byId("idTable");

            //Inizializzo la tabella
            var aColumns = oTable.removeAllColumns();
            aColumns.forEach(function (oColumn) {
                oColumn.destroy(); // Questo distruggerà la colonna
            });

            that.setTable2('StaffingTable', oTable);
            var data = new Date(that.getView().getModel("PeriodoContabile").oData.Date);

            var nWorkingDays = this.getView().getModel("workingDays").oData;

            for (let i = 0; i < monthNumber; i++) {

                var tempMonth = new Date(startDate);
                tempMonth.setMonth(tempMonth.getMonth() + i);
                var period = tempMonth.getMonth();
                var year = tempMonth.getFullYear();
                var key = `${(period + 1).toString().padStart(2, '0')}/${year}`; // Formattato correttamente per corrispondere alle chiavi in nWorkingDays
                var path = "TreeTable>" + (period + 1).toString() + year.toString();
                // that.checkMonthModel((period + 1).toString() + year.toString());
                if (tempMonth > data) {
                    var oTempColumn = new Column({
                        headerSpan: 100,
                        width: "60px",
                        visible: true,

                        hAlign: "Left",
                        multiLabels: [
                            new Text({ text: 'Days' }),
                            new Text({ text: `${period + 1}/${year}(${nWorkingDays[key]})` }),
                        ],
                        template: new Input({
                            type: "Number",
                            value: "{" + path + "}",
                            change: that.numberInputChange,
                            valueState: sap.ui.core.ValueState.Information,
                        })
                    });

                }
                else {
                    var oTempColumn = new Column({
                        headerSpan: 100,
                        width: "60px",
                        visible: true,
                        hAlign: "Left",
                        multiLabels: [
                            new Text({ text: 'Days' }),
                            new Text({ text: `${period + 1}/${year}(${nWorkingDays[key]})` }),
                        ],
                        template: new Text({
                            text: {
                                path: path,
                                formatter: that.formatQuantity
                            }
                        })
                    })
                }
                oTable.addColumn(oTempColumn);
            }


            oTable.attachRowsUpdated(function () {
                if (oTable) {
                    var rows = oTable.getRows();
                    if (rows && rows.length > 0) {
                        rows.forEach(row => {
                            row.getCells().forEach(function (cell) {
                                cell.removeStyleClass("boldText");
                                if (cell.getId().indexOf('input') > 0) {

                                    try {
                                        if (!cell.getEditable()) {
                                            document.getElementById(cell.getId()).children[0].children[0].style.backgroundColor = "white";
                                        }
                                    } catch (error) {

                                    }
                                }
                            });

                        })
                    }
                    var oLastRow = rows[rows.length - 1];
                    // Verifica se l'ultima riga esiste prima di chiamare getCells
                    if (oLastRow) {

                        oLastRow.getCells().forEach(function (cell) {
                            cell.addStyleClass("boldText");
                            if (cell.getId().indexOf('input') > 0) {

                                try {
                                    document.getElementById(cell.getId()).children[0].children[0].style.fontWeight = 'bold';
                                    document.getElementById(cell.getId()).children[0].children[0].style.backgroundColor = "white";

                                    // document.getElementById(cell.getId()).children[0].style.fontWeight = 'bold'
                                } catch (error) {

                                }
                            }
                        });

                        //  oLastRow.addStyleClass('bold-row');

                    }
                }
            });
        },
        handleSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter("Name", FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },
        _configValueHelpDialog: function () {
            var sInputValue = this.byId("productInput").getValue(),
                oModel = this.getView().getModel(),
                aProducts = oModel.getProperty("/EmpList");

            aProducts.forEach(function (oProduct) {
                oProduct['selected'] = (oProduct.PersonFullName === sInputValue);
            });
            oModel.setProperty("/EmpList", aProducts);
        },
        formatCostBalance(value) {
            return value ? 'IC Allocation Cost - ' + value : '';

        },
        ExcudeEmpByExpenses() {
            let goModel = this.getView().getModel();
            var Expenses = goModel.getProperty("/Expenses");
            var EmpList = this.getView().getModel('EmpList').oData;
            var Group = [];
            var Emps = [];

            Group.push(Expenses.find(e => e.EngagementProjectResource === 'E003') ? '1000' : '');
            Group.push(Expenses.find(e => e.EngagementProjectResource === 'E004') ? '2000' : '');
            Group.push(Expenses.find(e => e.EngagementProjectResource === 'E005') ? '3000' : '');

            EmpList.forEach((element) => {
                if (!Group.find(e => e === element.CompanyCode)) {
                    Emps.push(element)
                }
            })
            goModel.setProperty("/EmpList", Emps);
        },
        setEmpList() {

            var that = thatSchedaCommessa;

            var Emps = that.getView().getModel("EmpList").oData;
            var CostRate = that.getView().getModel("CostRate").oData;
            var orgId = that.getView().getModel("currentProjectModel").oData.orgId;
            var dummy = that.getView().getModel("Dummy").oData;
            var Distattacati = that.getView().getModel('Distattacati').oData;

            var empList = [];
            for (let i = 0; i < Emps.length; i++) {
                if (dummy.find(e => e.Employee === Emps[i].PersonWorkAgreement)) {
                    Emps.splice(i, 1);
                    i--;
                    continue;
                }
                if (Distattacati.find(e => e.PersonnelNumber === Emps[i].PersonWorkAgreement)) {
                    Emps.splice(i, 1);
                    i--;
                    continue;
                }
                let obj = JSON.parse(JSON.stringify(Constant['StaffingTable']));
                that.setEmpCost(obj, Emps[i], CostRate, orgId, 'Z010');
                obj.StartDate = Emps[i].StartDate
                empList.push(obj)
            }

            const oModel = new sap.ui.model.json.JSONModel();
            oModel.setData(empList);
            this.setModel(oModel, 'EmpList');

            this.ExcudeEmpByExpenses();
        },
        getStaffingRaw(StrName, monthNumber, startDate) {
            var obj = JSON.parse(JSON.stringify(Constant[StrName]));
            for (let i = 0; i < monthNumber; i++) {

                var tempMonth = new Date(startDate);
                tempMonth.setMonth(tempMonth.getMonth() + i);
                var period = tempMonth.getMonth() + 1;
                var year = tempMonth.getFullYear();

                obj[period.toString() + year.toString()] = 0;
            }

            return obj;
        },
        onCollapseExpandPress: function () {
            var that = globalThis.thatSchedaCommessa;

            var oSideNavigation = that.byId("sideNavigation");
            var bExpanded = oSideNavigation.getExpanded();
            oSideNavigation.setExpanded(!bExpanded);
            oSideNavigation.setVisible(true);

            // Ottieni il riferimento all'elemento nella vista utilizzando byId
            var oNavList = that.getView().byId("navList");

            // Ora puoi lavorare con oNavList, ad esempio, nascondendolo all'inizio
            oNavList.setVisible(true);
        },
        onSchedaCommessa: function (oEvent) {
            var that = globalThis.thatSchedaCommessa;

            var flexBoxSc = that.getView().byId("flexBoxSc");
            flexBoxSc.setVisible(true);

        },

        onSchedulazione: function (oEvent) {
            var that = globalThis.thatSchedaCommessa;

            var flexBoxSc = that.getView().byId("flexBoxSc");
            flexBoxSc.setVisible(false);

            var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
            oRouter.navTo("RouteSchedulazione");
        },

        dateFilter: function (startDate, endDate) {
            var oStartDatePicker = this.getView().byId("startDateFilter");
            var oEndDatePicker = this.getView().byId("endDateFilter");

            // Imposta la data di inizio (startDate) nella DatePicker
            oStartDatePicker.setValue(startDate);

            // Imposta la data di fine (endDate) nella DatePicker
            oEndDatePicker.setValue(endDate);

        },

        getStaffingListModel: async function (sProjectId) {
            var that = globalThis.thatSchedaCommessa;

            let filterStaffingList = `ProjectID eq '${sProjectId}'`;//'${globalUserInfo.PersonWorkAgreement}'
            return await that.getStaffingList("StaffingList", filterStaffingList);
        },

        setActivityType: function () {

            var Demand = this.getView().getModel('Demand').oData.filter(e => e.Quantity > 0);
            var Activity = this.removeDuplicateBy(Demand,
                x => x.EngagementProjectResource + x.WorkPackage,
                function myFunction(x) {
                    return {
                        ActivityType: x.EngagementProjectResource,
                        WorkPackage: x.WorkPackage,
                        Revenue: (x.DemandRevAmt / x.Quantity) * 8,
                        Currency: x.Currency,
                        UnitOfMeasure: x.UnitOfMeasure
                    };
                });

            const oModel = new sap.ui.model.json.JSONModel();
            oModel.setData(Activity);
            this.setModel(oModel, 'ActivityTypeWP');
        },
        myBack() {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            this.getView().getModel().setData({});
            this.removeAllMessages();
            this._revenueDeltaWarningMessage = null;
            this._isRevenueDeltaPositive = false;
            this._revenueDeltaPopupShown = false;
            this.getView().byId('idheaderDataSimpleForm').setVisible(false);
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteHome", {}, true);
            }
        },
        onChangeWorkpackage: function (oEvent) {
            var Activity = this.getView().byId('idComboBoxAddActivityType')
            var oModel = this.getView().getModel();
            var Key = this.getView().byId('idComboBoxAddWorkPackage').getSelectedKey();
            var oModelAct = this.getView().getModel('ActivityTypeWP').oData;
            var oDataModel = oModelAct.filter(e => e.WorkPackage === Key);
            var projectType = oModel.getProperty('/workPackageBillingType');
            if (projectType === '2') {
                Activity.setEditable(true);
                if (oDataModel.length === 1) {
                    Activity.setSelectedKey(oDataModel[0].ActivityType)
                } else {
                    Activity.setSelectedKey();
                }
            } else {
                oDataModel.push({ ActivityType: 'T007', WorkPackage: Key })
                Activity.setSelectedKey('T007');
                Activity.setEditable(false);
            }
            oModel.setProperty('/ActivityType', oDataModel);
        },
        setModel: function (oModel, sName) {
            var that = globalThis.thatSchedaCommessa;
            return that.getView().setModel(oModel, sName);
        },

        monthDiff: function (d1, d2) {
            var months;
            months = (d2.getFullYear() - d1.getFullYear()) * 12;
            months -= d1.getMonth();
            months += d2.getMonth();
            return months < 0 ? 0 : months + 1;
        },

        onDateChange: function (oEvent) {
            var that = globalThis.thatSchedaCommessa;

            var startDate = that.getView().byId("startDateFilter")._lastValue;
            var endDate = that.getView().byId("endDateFilter")._lastValue;
            var dStartDate = new Date(startDate);
            var dEndDate = new Date(endDate);
            var nMonth = that.monthDiff(dStartDate, dEndDate);

            that.setStaffingTable(nMonth, startDate);

            that.updateExpectedFinish();
        },

        updateExpectedFinish: function () {

            var that = globalThis.thatSchedaCommessa;
            var treeTable = that.getView().getModel("TreeTable").oData.TreeTable;
            var ButtonSave = that.getView().byId('ButtonSave');
            var Rows = that.getView().byId("idTable").getRows();
            var nErrorFields = 0;

            if (Rows && Rows.length > 0) {
                for (let i = 0; i < Rows.length - 1; i++) {
                    var Cells = Rows[i].getCells();
                    var sum = 0;
                    for (let k = 0; k < Cells.length; k++) {
                        if (Cells[k].getId().indexOf('input') > 0) {

                            if (Cells[k].getValueState() === sap.ui.core.ValueState.Information) {
                                sum = sumValues(sum, Cells[k].getValue());
                                Cells[k].setValueStateText('Enter a value for staffing');
                            } else if (Cells[k].getValueState() === sap.ui.core.ValueState.None) {
                                sum = sumValues(sum, Cells[k].getValue());
                                Cells[k].setValueState(sap.ui.core.ValueState.Information);
                                Cells[k].setValueStateText('Enter a value for staffing');
                            }
                            else { nErrorFields++ }
                        }
                    }
                    treeTable[i].GiorniPrevisto = sum;
                    treeTable[i].CostiPrevisto = multiplyValues(treeTable[i].GiorniPrevisto, treeTable[i].CostRateVarblAmount);
                    treeTable[i].TotalRevenue = multiplyValues(treeTable[i].Revenue, treeTable[i].GiorniPrevisto);
                    treeTable[i].RevenueALL = multiplyValues(treeTable[i].Revenue, sumValues(treeTable[i].GiorniPrevisto, treeTable[i].GiorniMaturato));
                }
            };
            if (nErrorFields > 0) {
                ButtonSave.setBlocked(true);
                ButtonSave.setEnabled(false)
            } else {
                ButtonSave.setBlocked(false);
                ButtonSave.setEnabled(true);
            }
            treeTable[treeTable.length - 1] = that.setLastValue(treeTable, true);
            that.sumPrevistoFinire();
        },

        getUser: async function (defaultEmailAddress) {
            let filterUserInfo = `DefaultEmailAddress eq '${defaultEmailAddress}'`;

            //Effettuo l'estrazione dei dati
            let url = `/odata/v4/userinfo/UserInfo?$filter=${filterUserInfo}`;
            var userLogged;
            await $.ajax({
                type: "GET",
                url: '/odata/v4/userinfo/UserInfo',
                contentType: 'application/json',
                success: function (sResult) {
                    let user = {
                        ...sResult.value[0],
                        isAdmin: false
                    };

                    if (user.BusinessRoles && user.BusinessRoles.length > 0 && user.BusinessRoles.find(role => role.BusinessRole === 'LB_BR_MANAGER_HRINFO')) {
                        user.isAdmin = true;
                    }

                    userLogged = user;
                },
                error: function (oError) {
                    userLogged = {};
                }
            });
            return userLogged;
        },
        checkBillingType() {
            var workPackageBillingType = this.getView().getModel().getProperty('/workPackageBillingType');
            var billingplan = this.getView().getModel('billingplan').oData;
            var BillingPlanUsageCategory = billingplan.find(e => e.BillingPlanUsageCategory !== workPackageBillingType)
            if (BillingPlanUsageCategory && (BillingPlanUsageCategory === '2' || workPackageBillingType === '2')) {
                let value = {
                    additionalText: 'checkBillingType and billing due date',
                    message: 'There are different Billing Plan Usage Category between Workpackage and Billing plan',
                    description: 'checkBillingType and billing due date'
                };
                this.setMessage(value);
                this.formatButton();
            }
        },

        checkMonthModel: function (monthPath) {
            var that = globalThis.thatSchedaCommessa;
            var oModel = that.getView().getModel("TreeTable");
            for (let index = 0; index < oModel.oData.TreeTable.length; index++) {
                if (oModel.oData.TreeTable[index][monthPath]) {
                    continue;
                } else {
                    oModel.oData.TreeTable[index][monthPath] = 0;
                }
            }
            that.getView().setModel(oModel, "TreeTable");
        },
        sumCostoMaturato: function () {
            var that = globalThis.thatSchedaCommessa;
            var oModel = that.getView().getModel("TreeTable");
            var TreeTable = oModel.oData.TreeTable;
            let CostiMaturato = TreeTable[TreeTable.length - 1].CostiMaturato;
            let TrasfertaMaturato = TreeTable[TreeTable.length - 1].TrasfertaMaturato;
            var oGModel = that.getView().getModel();
            var Expenses = oGModel.getProperty("/Expenses");
            var totale = Expenses.find(e => e.EngagementProjResourceText === 'Total');
            let sum = sumValues(sumValues(CostiMaturato, totale.actuals), TrasfertaMaturato);

            let CostBalance = oGModel.getProperty('/CostBalance');

            if (CostBalance && CostBalance.length > 0) {
                sum = sumValues(sum, CostBalance[CostBalance.length - 1].AmountInCompanyCodeCurrency);
            }

            oModel.setProperty("/sumCostoMaturato", sum);
            return sum;
        },

        sumPrevistoFinire: function () {
            var that = globalThis.thatSchedaCommessa;
            var oModel = that.getView().getModel("TreeTable");
            var TreeTable = oModel.getData().TreeTable;

            let CostiPrevisto = TreeTable[TreeTable.length - 1].CostiPrevisto;

            var oGModel = that.getView().getModel();
            var Expenses = oGModel.getProperty("/Expenses");
            var totale = Expenses.find(e => e.EngagementProjResourceText === 'Total');
            let sum = sumValues(CostiPrevisto, totale.sum);
            let matuarato = oModel.getProperty('/sumCostoMaturato');
            let sumTot = matuarato + sum

            let projectType = oGModel.getProperty("/workPackageBillingType");
            let Margin = 0;
            let businessCase = 0;
            if (projectType === "2") {
                let projectRevenue = oGModel.getProperty("/ProjectRevenue");
                let Amount = projectRevenue[projectRevenue.length - 1].AmountInTransactionCurrency;
                Margin = Amount - sumTot;
                businessCase = Margin / Amount * 100;
            } else if (!projectType) {

            } else {
                let Amount = oGModel.getProperty("/AmountToBeBilled");
                Margin = Amount - sumTot;
                businessCase = Margin / Amount * 100;
            }

            oModel.setProperty("/businessCase", businessCase);
            oModel.setProperty("/currentMargin", Margin);


            oModel.setProperty("/sumPrevistoFinire", sum);
            oModel.setProperty("/sumTotCost", sumTot);
            that.setFinPlanTab();
            return sum;
        },
        setFinPlanTab() {

            var that = globalThis.thatSchedaCommessa;
            var projectData = that.getView().getModel().getData().Project;
            var billingPlan = that.getView().getModel().getData().ProjectRevenue;

        var workPackageBillingType = that.getView().getModel().getData().workPackageBillingType;

        var Items = Constant["FinPlanTab"];

        var oModelTree = that.getView().getModel("TreeTable");

        var businessCase = oModelTree.getProperty("/businessCase");
        var Margin = oModelTree.getProperty("/currentMargin");
        var sumPrevistoFinire = oModelTree.getProperty("/sumPrevistoFinire");
        var sumTotCost = oModelTree.getProperty("/sumTotCost");
        var sumCostoMaturato = oModelTree.getProperty("/sumCostoMaturato");
        var businessCaseValue = normalizeNumber(projectData.YY1_BusinessCase_Cpr);
        var sumPrevistoFinireNum = normalizeNumber(sumPrevistoFinire);
        var sumCostoMaturatoNum = normalizeNumber(sumCostoMaturato);
        var amountToBeBilled = normalizeNumber(this.getView().getModel().getData().AmountToBeBilled);
        var revenue = 0;
        let TreeTable = oModelTree.getData().TreeTable;
        //Progetti TM
        if (workPackageBillingType === '2') {
            revenue = normalizeNumber(TreeTable[TreeTable.length - 1].TotalRevenue);
            Items.items[0].ForecastDescr = 'Expected Revenue: \n' + Items.items[0].ForecastDescr.split('\n')[0];
        } else if (workPackageBillingType === '1' || workPackageBillingType === '3') {
            var divisor = 1 - (businessCaseValue / 100);
            revenue = divisor !== 0 ? sumPrevistoFinireNum / divisor : 0;
            Items.items[0].ForecastDescr = 'Expected Revenue: \n' + Items.items[0].ForecastDescr.split('\n')[1];
        }
        var bc = parseFloat(businessCase).toLocaleString('it-IT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        //Progetti internal
        if (billingPlan && billingPlan.length > 0) {
            if (workPackageBillingType === '2') {
                var billingActual = normalizeNumber(billingPlan[Math.max(0, billingPlan.length - 3)].AmountInTransactionCurrency);
                Items.items[0].Actual = billingActual;
                Items.items[1].Actual = sumCostoMaturatoNum;
                Items.items[2].Actual = billingActual - sumCostoMaturatoNum;
                Items.items[3].Actual = billingActual !== 0 ? 100 * (1 - sumCostoMaturatoNum / billingActual) : 0;
            } else if (workPackageBillingType === '1' || workPackageBillingType === '3') {
                var divisorActual = 1 - (businessCaseValue / 100);
                var revenueActual = divisorActual !== 0 ? sumCostoMaturatoNum / divisorActual : 0;
                Items.items[0].Actual = revenueActual;
                Items.items[1].Actual = sumCostoMaturatoNum;
                Items.items[2].Actual = revenueActual - sumCostoMaturatoNum;
                Items.items[3].Actual = revenueActual !== 0 ? 100 * Items.items[2].Actual / revenueActual : 0;
            }

        } else {
            Items.items[0].Actual = 0;
            Items.items[1].Actual = sumCostoMaturatoNum;
            Items.items[2].Actual = -sumCostoMaturatoNum;
            Items.items[3].Actual = 0;

        };

        Items.items[0].Forecast = normalizeNumber(revenue);
        Items.items[1].Forecast = sumPrevistoFinireNum;
        Items.items[2].Forecast = sumValues(Items.items[0].Forecast, -Items.items[1].Forecast);
        Items.items[3].Forecast = Items.items[0].Forecast !== 0 ? 100 * (1 - Items.items[1].Forecast / Items.items[0].Forecast) : 0;

        Items.items[0].Total = sumValues(Items.items[0].Forecast, Items.items[0].Actual);
        Items.items[1].Total = sumValues(Items.items[1].Forecast, Items.items[1].Actual);
        //  Items.items[3].Total = 100 * (1 - Number(Items.items[1].Total) / Number(that.getView().getModel().getData().AmountToBeBilled));

        if (workPackageBillingType === '2') {
            Items.items[2].Total = sumValues(Items.items[0].Total, -Items.items[1].Total);
            Items.items[3].Total = Items.items[0].Total !== 0 ? 100 * (1 - Items.items[1].Total / Items.items[0].Total) : 0;

        } else if (workPackageBillingType === '1' || workPackageBillingType === '3') {
            Items.items[2].Total = sumValues(amountToBeBilled, -Items.items[1].Total);
            Items.items[3].Total = amountToBeBilled !== 0 ? 100 * (1 - Items.items[1].Total / amountToBeBilled) : 0;

        }

        Items.items[0].SapContract = amountToBeBilled;
        Items.items[1].SapContract = multiplyValues(amountToBeBilled, (1 - businessCaseValue / 100));
        Items.items[2].SapContract = multiplyValues(amountToBeBilled, businessCaseValue / 100);
        Items.items[3].SapContract = businessCaseValue;

        Items.items[0].Delta = sumValues(Items.items[0].Total, -Items.items[0].SapContract);
        Items.items[1].Delta = sumValues(Items.items[1].Total, -Items.items[1].SapContract);
        Items.items[2].Delta = sumValues(Items.items[2].Total, -Items.items[2].SapContract);
        Items.items[3].Delta = sumValues(Items.items[3].Total, -Items.items[3].SapContract);
        Items.items.forEach(function (entry) {
            entry.DeltaWarning = false;
            entry.DeltaRaw = normalizeNumber(entry.Delta);
        });
        this._isRevenueDeltaPositive = normalizeNumber(Items.items[0].Delta) > 0;
        Items.items[0].DeltaWarning = this._isRevenueDeltaPositive;
        this.formatValueFinPlanTab(Items);

        var oModelName = 'FinPlanTab';
        const oModel = new sap.ui.model.json.JSONModel({});
        oModel.setData(Items);
        this.setModel(oModel, oModelName);

        this.setValueStateFinPlan();
        this._handleRevenueDeltaWarnings({ popup: true, log: true });

        },
        formatValueFinPlanTab(Items) {
            let object = {
                Actual: 0,
                Forecast: 0,
                Total: 0,
                SapContract: 0,
                Delta: 0,
            }
            for (let index = 0; index < 3; index++) {
                for (const property in object) {
                    Items.items[index][property] = this.formatFinSam(Items.items[index][property], ' €')
                }
            }
            for (let index = 3; index < 4; index++) {
                for (const property in object) {
                    Items.items[index][property] = this.formatFinSam(Items.items[index][property], ' %')
                }
            }
        },
        formatFinSam(value, uom) {
            let v = parseFloat(value).toLocaleString('it-IT', {
                minimumFractionDigits: 2
            });
            return Number.isNaN(value) ? uom : v + uom;
        },
        FinPlnChange(evt) {

            var oInput = evt.getSource();
            oInput.setValue(oInput.getLastValue());
        },
        setValueStateFinPlan() {

            var that = globalThis.thatSchedaCommessa;
            var Items = that.getView().getModel('FinPlanTab').getData().items;
            var oRows = that.getView().byId('FinPlanTabId').getRows();

            for (let j = 0; j < oRows.length; j++) {

                const oCells = oRows[j].getCells();

                oCells[1].setValueState(sap.ui.core.ValueState.None);
                oCells[2].setValueState(sap.ui.core.ValueState.None);
                oCells[3].setValueState(sap.ui.core.ValueState.None);
                oCells[4].setValueState(sap.ui.core.ValueState.None);
                if (!Items[j].DeltaWarning) {
                    oCells[5].setValueState(sap.ui.core.ValueState.None);
                }


                if (Items[j].Total.indexOf('-') === 0) {
                    oCells[3].setValueState(sap.ui.core.ValueState.Error)
                }

                if (j === oRows.length - 1) {
                    if (Items[j].Delta.indexOf('-') === 0) {
                        oCells[3].setValueState(sap.ui.core.ValueState.Error)
                    }
                }
                if (oCells[1].getValueStateText() !== Items[j].ActualDescr) {

                    oCells[1].setValueStateText(Items[j].ActualDescr);
                    oCells[2].setValueStateText(Items[j].ForecastDescr);
                    oCells[3].setValueStateText(Items[j].TotalDescr);
                    oCells[4].setValueStateText(Items[j].SapContractDescr);
                    oCells[5].setValueStateText(Items[j].DeltaDescr);
    

                    if (j === 3 || j === 2) {
                        oCells[3].addStyleClass('inputFontSize');
                    }
                }
            }
            this._handleRevenueDeltaWarnings({ log: true });
        },
        _handleRevenueDeltaWarnings: function (options) {
            options = options || {};
            var text = this._getRevenueDeltaWarningText();
            if (this._isRevenueDeltaPositive) {
                if (options.log && !this._revenueDeltaWarningMessage) {
                    this._revenueDeltaWarningMessage = this.setMessage({
                        type: sap.ui.core.MessageType.Warning,
                        message: "Delta revenue",
                        description: this._getRevenueDeltaWarningMessageDetail(),
                        additionalText: this._getRevenueDeltaWarningMessageDetail()
                    });
                    this.formatButton();
                }
                if (options.popup && (options.force || !this._revenueDeltaPopupShown)) {
                    sap.m.MessageBox.warning(text);
                    this._revenueDeltaPopupShown = true;
                }
            } else {
                if (this._revenueDeltaWarningMessage) {
                    this._MessageManager.removeMessages(this._revenueDeltaWarningMessage);
                    this._revenueDeltaWarningMessage = null;
                    this.formatButton();
                }
                if (options.resetPopup !== false) {
                    this._revenueDeltaPopupShown = false;
                }
            }
        },
        _getRevenueDeltaWarningText: function () {
            return "Totale pianificato è maggiore del totale contrattuale";
        },
        _getRevenueDeltaWarningMessageDetail: function () {
            return "Warning attivo sul Delta delle revenue: il totale pianificato supera il totale contrattuale (sezione Financial Summary - Delta Revenue).";
        },
        valueHelp: function (evt) {
            var oInput = evt.getSource();
            var valueState = oInput.getValueState();
            var bindingContext = oInput.getBindingContext("FinPlanTab");
            var item = bindingContext ? bindingContext.getObject() : null;

            globalThis.thatSchedaCommessa.setValueStateFinPlan();

            switch (valueState) {
                case sap.ui.core.ValueState.Error:
                    break;
                case sap.ui.core.ValueState.Information:
                    oInput.setValueState(sap.ui.core.ValueState.None);
                    break;
                case sap.ui.core.ValueState.None:
                    oInput.setValueState(sap.ui.core.ValueState.Information);
                    break;
                default:
                    oInput.setValueState(sap.ui.core.ValueState.Information);
                    break;
            }

            if (item && item.DeltaWarning) {
                oInput.setValueState(sap.ui.core.ValueState.Warning);
            }
        },









