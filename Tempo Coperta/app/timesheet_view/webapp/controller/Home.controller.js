sap.ui.define([
    "./BaseController",
    "../Component",
    'sap/ui/model/odata/v2/ODataModel',
    "sap/ui/core/format/DateFormat",
    "sap/m/Text",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button",
    'sap/ui/core/Fragment',
    'sap/m/MessageToast',
    "sap/m/MessageBox",
    "sap/ui/core/syncStyleClass",
    "sap/ui/unified/library",
    "sap/ui/unified/DateTypeRange",
    "sap/ui/core/date/UI5Date"
],

    function (BaseController, Component, ODataModel, DateFormat, Text, JSONModel, Dialog, Button, Fragment, MessageToast, MessageBox, syncStyleClass, UnifiedLibrary, DateTypeRange, UI5Date) {
        "use strict";

        let globalUserInfo = {};
        let currentMonthValue = new Date();
        let overtimeRegularHours = "Z010";
        let overtimeExtraEffort = "Z014";
        let ProjListInternal = [];

        return BaseController.extend("com.lobra.timesheetview.controller.Home", {
            onInit: async function () {
                var that = this;
                globalThis.thatHome = this;

                // Aggiungo popup Log esiti
                this.initPopoverMessage();

                // Inizializzo il mese corrente
                var oModel = new sap.ui.model.json.JSONModel({
                    selectedMonth: new Date()
                });
                this.getView().setModel(oModel, "currentMonthModel");

                // Inizializzo il timer di inattivitÃ 
                this.resetInactivityTimer();

                // Aggiungi listener per vari tipi di eventi per resettare il timer
                ["mousemove", "mousedown", "keypress", "scroll"].forEach(event => {
                    document.addEventListener(event, this.resetInactivityTimer.bind(this));
                });

                var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter.getRoute("RouteHome").attachPatternMatched(that._onRouteMatchedTimesheet, that);
            },

            _onRouteMatchedTimesheet: async function (oEvent) {
                var that = globalThis.thatHome;

                globalUserInfo = that.getModel("UserInfo").getData();

                if (!globalUserInfo || globalUserInfo === null || globalUserInfo === undefined) {
                    MessageBox.error("Impossibile recuperare le info dell'utente connesso.");
                    that.onUnauthorized();
                    return;
                }

                // Inizializzo la popup di BusyDialog
                if (!that._pBusyDialog) {
                    that._pBusyDialog = Fragment.load({
                        name: "com.lobra.timesheetview.view.BusyDialog",
                        controller: this,
                    }).then(
                        function (oBusyDialog) {
                            that.getView().addDependent(oBusyDialog);
                            syncStyleClass("sapUiSizeCompact", that.getView(), oBusyDialog);
                            return oBusyDialog;
                        }.bind(that)
                    );
                }

                // Estraggo e creo i modelli per decodificare i testi
                await that.getDecodeTextModels();

                that._bindView();
            },

            _bindView: async function () {
                var that = globalThis.thatHome;

                /*that.getView().byId("idButtonAdmin").setProperty("visible", globalUserInfo.isAdmin);
                that.getView().byId("idBeHalfTimesheet").setProperty("visible", globalUserInfo.isAdmin);
                var isVisible = globalUserInfo.isManager || globalUserInfo.isTeamManager;
                that.getView().byId("idButtonManager").setProperty("visible", isVisible);*/

                /*if (globalUserInfo.isExternal) {
                    that.getView().byId("idButtonTimeOff").setProperty("visible", true);
                    that.getView().byId("idButtonOvertime").setProperty("visible", true);
                    that.getView().byId("idAddExtraEffort").setProperty("visible", false);
                } else {
                    that.getView().byId("idButtonTimeOff").setProperty("visible", true);
                    that.getView().byId("idButtonOvertime").setProperty("visible", true);
                }*/

                // Metto in attesa il frontend
                that._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.open();

                    that.getView().byId("idFooter").setProperty("visible", true);

                    // Setto la lista dei progetti abilitati sull'utente
                    await that.getStaffingListModel(currentMonthValue);

                    // Carico la lista di progetti interni
                    //let filterProj = `ProjectCategory eq 'I' and RestrictTimePosting eq 'N' and ProjectStage eq 'P003'`; //aggiungere lo stato? (ProjectStage) e le date di start end (StartDate-EndDate)
                    //ProjListInternal = await that.getProjectListExpanded(filterProj);

                    ProjListInternal = this.getModel("ProjectList").getData().filter(function (item) {
                        return item.ProjectCategory === "I" &&
                            item.RestrictTimePosting === "N" &&
                            item.ProjectStage === "P003"
                    });

                    // Carico i dati del Timeseheet dell'utente
                    await that.getTimesheetEmployee(currentMonthValue);

                    oBusyDialog.close();
                }.bind(that));
            },

            getStaffingListModel: async function (sDate) {
                var that = globalThis.thatHome;
                that.getView().byId("idComboBoxAddProject").setProperty("busy", true);

                var firstDayOfMonth = new Date(sDate.getFullYear(), sDate.getMonth(), 1);
                var lastDayOfMonth = new Date(sDate.getFullYear(), sDate.getMonth() + 1, 0);

                // Ottieni la data attuale
                var period = (sDate.getMonth() + 1).toString().padStart(3, '0');
                var FcYear = sDate.getFullYear();

                //Prendo i WorkAgreement in base alla data selezionata per filtrare
                let WorkAssignments = globalUserInfo.WorkAssignments.filter(personWA =>
                    lastDayOfMonth >= (new Date(personWA.WorkAssignmentStartDate)) &&
                    firstDayOfMonth <= (new Date(personWA.WorkAssignmentEndDate))
                );

                var oWAFilter = null;
                if (WorkAssignments && WorkAssignments.length > 0) {
                    oWAFilter = this._createFilterFromArrayNew(WorkAssignments, "StaffedEmployee", "PersonWorkAgreement");
                } else {
                    var oModel = this.getView().getModel("StaffingListEmployee");
                    if (oModel) {
                        oModel.setData(null);
                    }
                    return;
                }

                // Filtri costanti
                var oConstantFilter = new sap.ui.model.Filter([
                    new sap.ui.model.Filter("ResType", sap.ui.model.FilterOperator.EQ, '0ACT'),
                    //new sap.ui.model.Filter("StaffedEffort", sap.ui.model.FilterOperator.GT, 0),
                    new sap.ui.model.Filter("Period", sap.ui.model.FilterOperator.EQ, period),
                    new sap.ui.model.Filter("FcYear", sap.ui.model.FilterOperator.EQ, FcYear)
                ], true);

                // Combina tutti i filtri necessari con AND
                var combinedFilters = [
                    oWAFilter,
                    oConstantFilter
                ].filter(f => f !== null);
                var finalFilter = combinedFilters.length > 1 ? new sap.ui.model.Filter(combinedFilters, true) : combinedFilters[0];

                return Promise.all([
                    await this.loadModelNew('/StaffingList', finalFilter ? [finalFilter] : [], 'StaffingListEmployee', 'ProjectName')
                ]).then(function (results) {
                    var StaffingListEmployee = this.getModel("StaffingListEmployee").getData();
                    var WpBillingTypeList = that.getView().getModel("WpBillingTypeList").getData();

                    StaffingListEmployee = StaffingListEmployee.filter((staffItem) => {
                        // Controlla se StaffedEffort Ã¨ diverso da 0
                        if (parseFloat(staffItem.StaffedEffort) !== 0) {
                            return true;
                        }

                        // Verifico se il progetto Ã¨ Time Material
                        const correspondingBillingItem = WpBillingTypeList.find((billingItem) => {
                            return billingItem.WorkPackage === staffItem.WorkPackageID;
                        });

                        return correspondingBillingItem && correspondingBillingItem.BillingPlanUsageCategory === '2';
                    });

                    const oModel = new sap.ui.model.json.JSONModel();
                    oModel.setData(StaffingListEmployee);
                    this.getView().setModel(oModel, "StaffingListEmployee");

                    that.getView().byId("idComboBoxAddProject").setProperty("busy", false);
                }.bind(this)).catch(function (oError) {
                    console.error("Error loading help data", oError);
                    throw oError;
                });

            },

            getTimesheetEmployee: async function (sDate) {
                var that = globalThis.thatHome;
                var firstDayOfMonth = that.formatDateToISOString(new Date(sDate.getFullYear(), sDate.getMonth(), 1), false);
                var lastDayOfMonth = that.formatDateToISOString(new Date(sDate.getFullYear(), sDate.getMonth() + 1, 0), false);

                // Filtro Date
                var oDateFilter = new sap.ui.model.Filter("TimeSheetDate", sap.ui.model.FilterOperator.BT, firstDayOfMonth, lastDayOfMonth);

                // Filtro su WorkAgreement
                var oWAFilter = this._createFilterFromArrayNew(globalUserInfo.WorkAssignments, "PersonWorkAgreement", "PersonWorkAgreement");

                // Filtri costanti
                var oConstantFilter = new sap.ui.model.Filter([
                    new sap.ui.model.Filter("TimeSheetStatus", sap.ui.model.FilterOperator.NE, '60'),
                    new sap.ui.model.Filter("TimeSheetStatus", sap.ui.model.FilterOperator.NE, '50'),
                    new sap.ui.model.Filter("RecordedHours", sap.ui.model.FilterOperator.GT, 0)
                ], true);

                // Combina tutti i filtri necessari con AND
                var combinedFilters = [
                    oDateFilter,
                    oWAFilter,
                    oConstantFilter
                ].filter(f => f !== null);
                var finalFilter = combinedFilters.length > 1 ? new sap.ui.model.Filter(combinedFilters, true) : combinedFilters[0];

                return Promise.all([
                    await this.loadModelNew('/TimesheetRecords', finalFilter ? [finalFilter] : [], 'TimesheetInfoEmployee', 'TimeSheetDate')
                ]).then(function (results) {

                    var oModel = this.getView().getModel("TimesheetInfoEmployee");
                    var TimesheetInfoEmployee = oModel.getData();

                    for (let i = 0; i < TimesheetInfoEmployee.length; i++) {
                        const element = TimesheetInfoEmployee[i];
                        element.TimeSheetOperation = "";
                    }

                    // Creo la tabella
                    that.populateTableByDate(TimesheetInfoEmployee, new Date(sDate));

                }.bind(this)).catch(function (oError) {
                    console.error("Error loading help data", oError);
                    throw oError;
                });
            },

            /** GESTIONE ROUTING  */
            onPMview: function (oEvent) {
                var that = globalThis.thatHome;
                var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter.navTo("RoutePM");
            },

            onHRview: function (oEvent) {
                var that = globalThis.thatHome;
                var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter.navTo("RouteHR");
            },

            onTimeOffListview: function (oEvent) {
                var that = globalThis.thatHome;
                var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter.navTo("RouteTimeOffList");
            },

            onOvertimeListview: function (oEvent) {
                var that = globalThis.thatHome;
                var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter.navTo("RouteOvertimeList");
            },

            loadTimesheetView: function (oEvent) {
                var that = globalThis.thatHome;

                var timesheetViewType = oEvent.getSource().getKey();
                if (timesheetViewType === 'my') {
                    that.onRefreshTable();

                } else if (timesheetViewType == 'behalf') {
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                    oRouter.navTo("RouteBeHalf");
                }
            },

            onLayoutList: function () {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteTimesheetEmployeeList");
            },

            onRefreshTable: function () {
                var that = globalThis.thatHome;

                // Setto la lista dei progetti abilitati sull'utente
                that.getStaffingListModel(currentMonthValue);

                let oDataPicker = this.getView().byId("HiddenDP");
                if (oDataPicker) {
                    oDataPicker.setDateValue(currentMonthValue);
                }

                that._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.open();

                    //Carico i dati del Timeseheet dell'utente
                    await this.getTimesheetEmployee(currentMonthValue);
                    oBusyDialog.close();
                }.bind(that));
            },

            onPreviousMonth: function () {
                var that = globalThis.thatHome;
                var oModel = this.getView().getModel("currentMonthModel");
                var selectedMonth = oModel.getProperty("/selectedMonth");
                selectedMonth.setMonth(selectedMonth.getMonth() - 1);
                oModel.setProperty("/selectedMonth", selectedMonth);

                var oLabel = this.getView().byId("currentMonthLabel");
                if (oLabel) {
                    oLabel.setText(this.formatMonthAndYear(selectedMonth));
                }

                currentMonthValue = new Date(selectedMonth);

                // Setto la lista dei progetti abilitati sull'utente
                that.getStaffingListModel(currentMonthValue);

                let oDataPicker = this.getView().byId("HiddenDP");
                if (oDataPicker) {
                    oDataPicker.setDateValue(currentMonthValue);
                }

                that._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.open();

                    //Carico i dati del Timeseheet dell'utente
                    await this.getTimesheetEmployee(currentMonthValue);
                    oBusyDialog.close();
                }.bind(that));
            },

            onNextMonth: function () {
                var that = globalThis.thatHome;

                var oModel = this.getView().getModel("currentMonthModel");
                var selectedMonth = oModel.getProperty("/selectedMonth");
                selectedMonth.setMonth(selectedMonth.getMonth() + 1);
                oModel.setProperty("/selectedMonth", selectedMonth);

                var oLabel = this.getView().byId("currentMonthLabel");
                if (oLabel) {
                    oLabel.setText(this.formatMonthAndYear(selectedMonth));
                }

                currentMonthValue = new Date(selectedMonth + 1);

                // Setto la lista dei progetti abilitati sull'utente
                that.getStaffingListModel(currentMonthValue);

                let oDataPicker = this.getView().byId("HiddenDP");
                if (oDataPicker) {
                    oDataPicker.setDateValue(currentMonthValue);
                }

                that._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.open();

                    //Carico i dati del Timeseheet dell'utente
                    await this.getTimesheetEmployee(currentMonthValue);
                    oBusyDialog.close();
                }.bind(that));
            },

            openHiddenDatePicker: function (oEvent) {
                this.getView().byId("HiddenDP").openBy(oEvent.getSource().getDomRef());
            },

            onSelectMonth: function (oEvent) {
                var that = globalThis.thatHome;

                let dpDate = oEvent.getSource().getDateValue();

                currentMonthValue = new Date(dpDate);

                var oModel = new sap.ui.model.json.JSONModel({
                    selectedMonth: new Date(dpDate)
                });
                that.getView().setModel(oModel, "currentMonthModel");

                var oLabel = this.getView().byId("currentMonthLabel");
                if (oLabel) {
                    oLabel.setText(this.formatMonthAndYear(currentMonthValue));
                }

                // Setto la lista dei progetti abilitati sull'utente
                that.getStaffingListModel(currentMonthValue);

                that._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.open();

                    //Carico i dati del Timeseheet dell'utente
                    await this.getTimesheetEmployee(currentMonthValue);
                    oBusyDialog.close();
                }.bind(that));
            },

            formatMonthAndYear: function (sDate) {
                var that = globalThis.thatHome;
                let formattedMonth = sDate.toLocaleString('default', { month: 'long', });
                let formattedYear = sDate.getFullYear();
                return `${that.titleCase(formattedMonth)}  ${formattedYear}`;
            },

            titleCase: function (string) {
                return string[0].toUpperCase() + string.slice(1).toLowerCase();
            },

            populateTableByDate: async function (sTimesheetArray, sDate) {
                var that = globalThis.thatHome;

                var oTable = that.getView().byId("idTable");
                var oDataByWBSElement = {}; // Un oggetto per raggruppare i dati per WBSElement

                //Inizializzo la tabella
                oTable.removeAllColumns();
                oTable.removeAllItems();

                //** CREAZIONE STRUTTURA TABELLA DINAMICA */
                // Aggiungi colonne per la descrizione progetto
                var oWBSDescriptionColumn = new sap.m.Column({
                    width: "17em",
                    //fixed: "Left",
                    header: new Text({
                        text: "Progetto"
                    })
                });
                oTable.addColumn(oWBSDescriptionColumn);

                // Creare colonne per i giorni del mese selezionato
                var oDate = sDate;
                var iMonth = oDate.getMonth() + 1; // Mese corrente (i mesi partono da 0)
                var iYear = oDate.getFullYear(); // Anno corrente

                var freezeTimesheet = await this.checkFreezeTimesheet(globalUserInfo.isExternal, sDate);

                // Raggruppa i dati del modello per WBSElement con il mese corrente
                for (let i = 0; i < sTimesheetArray.length; i++) {
                    const oEntry = sTimesheetArray[i];
                    //Se l'overtimecategory Ã¨ vuoto gli setto "Z010" come regular hours
                    if (!oEntry.TimeSheetOvertimeCategory || oEntry.TimeSheetOvertimeCategory == '' && oEntry.TimeSheetOvertimeCategory == null && oEntry.TimeSheetOvertimeCategory == undefined) {
                        oEntry.TimeSheetOvertimeCategory = overtimeRegularHours; //Regular Hours
                    }

                    var sWBSElement = oEntry.WBSElement;
                    var oTimeSheetDate = new Date(oEntry.TimeSheetDate);
                    var iEntryMonth = oTimeSheetDate.getMonth() + 1; // Mese del TimeSheetDate
                    var iEntryYear = oTimeSheetDate.getFullYear();
                    var sTimeSheetOvertimeCategory = oEntry.TimeSheetOvertimeCategory; // Nuova chiave
                    var sPersonWorkAgreement = oEntry.PersonWorkAgreement || oEntry.PersonWorkAgreementExternalID || '';

                    // Crea una chiave che incorpora tutti i campi necessari
                    var sKey = `${sWBSElement}_${sTimeSheetOvertimeCategory}_${sPersonWorkAgreement}`;

                    // Verifica se il mese del TimeSheetDate Ã¨ uguale al mese corrente
                    if (iEntryMonth === iMonth && iEntryYear === iYear) {
                        if (!oDataByWBSElement[sKey]) {
                            oDataByWBSElement[sKey] = [];
                        }
                        oDataByWBSElement[sKey].push(oEntry);
                    }
                };

                var daysInMonth = new Date(iYear, iMonth, 0).getDate(); // Numero di giorni nel mese corrente

                //Aggiungo le colonne alla tabella (tante colonne quanti i giorni del mese)
                for (var i = 1; i <= daysInMonth; i++) {
                    var sColumnId = "day_" + i;
                    var dataSpecifica = new Date(iYear, iMonth - 1, i);
                    var linguaPreferita = navigator.language || navigator.userLanguage;
                    var nomeGiornoSettimana = dataSpecifica.toLocaleDateString(linguaPreferita, { weekday: 'short' });
                    var oColumn = new sap.m.Column({
                        width: "3em",
                        hAlign: sap.ui.core.TextAlign.Center,
                        header: new Text({
                            width: "3em",
                            text: `${nomeGiornoSettimana}\n${i}`,
                        }),
                    });
                    oTable.addColumn(oColumn);
                }

                //aggiungo colonna del totale
                var oTotalRowColumn = new sap.m.Column({
                    width: "5em",
                    hAlign: sap.ui.core.TextAlign.Center,
                    header: new Text({
                        width: "5em",
                        text: "Total",
                    }),
                });
                oTable.addColumn(oTotalRowColumn);

                // Aggiunta colonna "Elimina Riga"
                var oDeleteColumn = new sap.m.Column({
                    width: "3em",
                    header: new Text({
                        text: "",
                    }),
                });

                oTable.addColumn(oDeleteColumn);

                //** CREAZIONE ITEMS DA INSERIRE NELLA TABELLA */

                //Inizializzo il calendario di Fabbrica
                let filterCalendar = `CalendarYear eq '${currentMonthValue.getFullYear()}'`
                let FactoryCalendar = await this.getFactoryCalendar(filterCalendar);
                var oModelFactory = new sap.ui.model.json.JSONModel();
                oModelFactory.setData(FactoryCalendar);
                this.setModel(oModelFactory, "factoryCalendar");

                // Ottieni il numero di giorni lavorativi
                let totalWorkingHours = 0;
                let workingDays = await this.getWorkingDays(sDate, true);

                if (workingDays) {

                    var dailyWorkingHours = 8;
                    let matchingWA = globalUserInfo.WorkAssignments.find(personWA =>
                        lastDayOfMonth >= (new Date(personWA.WorkAssignmentStartDate)) &&
                        firstDayOfMonth <= (new Date(personWA.WorkAssignmentEndDate)));
                    if (matchingWA) {
                        // Calcolo le ore di lavoro giornaliere dell'utente
                        if (matchingWA.WeeklyWorkingHours > 0 && matchingWA.WeeklyWorkingDays > 0) {
                            dailyWorkingHours = matchingWA.WeeklyWorkingHours / matchingWA.WeeklyWorkingDays
                        }
                    }

                    totalWorkingHours = workingDays * dailyWorkingHours;
                }

                // Carico i dati della staffing list precedentemente estratta
                //let StaffingList = this.getModel("StaffingListEmployee").oData;
                let StaffingList = this.getModel("StaffingListEmployee");
                if (!StaffingList) {
                    StaffingList = {};
                } else {
                    StaffingList = StaffingList.oData;
                }

                // Itera sui dati raggruppati per WBSElement
                for (var sWBSElement in oDataByWBSElement) {
                    if (oDataByWBSElement.hasOwnProperty(sWBSElement)) {

                        // Prendo tutti record della WBS "in canna"
                        var aTimeSheetEntriesForWBSElement = oDataByWBSElement[sWBSElement];

                        // Estraggo i dati del progetto dalla staffing list
                        // let matchingProj = StaffingList.find(project => project.WorkPackageID === aTimeSheetEntriesForWBSElement[0].WBSElement); 
                        // commentato perchÃ¨ ho giÃ  gli elementi su una posizione qualsiasi del timesheet (se lo attivi non funziona sui progetti interni)

                        let isProjectInternal = ProjListInternal.find(project => project.ProjectID === aTimeSheetEntriesForWBSElement[0].Project);

                        // Estraggo il Workassignment corretto
                        var firstDayOfMonth = new Date(sDate.getFullYear(), sDate.getMonth(), 1);
                        var lastDayOfMonth = new Date(sDate.getFullYear(), sDate.getMonth() + 1, 0);

                        let matchingWA = globalUserInfo.WorkAssignments.find(el =>
                            el.PersonWorkAgreement === aTimeSheetEntriesForWBSElement[0].PersonWorkAgreement &&
                            lastDayOfMonth >= (new Date(el.WorkAssignmentStartDate)) &&
                            firstDayOfMonth <= (new Date(el.WorkAssignmentEndDate)))

                        /*if (globalUserInfo.isExternal) {
                            matchingWA = globalUserInfo.WorkAssignments.find(el =>
                                el.PersonWorkAgreement === aTimeSheetEntriesForWBSElement[0].PersonWorkAgreement);
                            //&& el.CompanyCode === matchingProj.ProjectCompanyCode);
                        }*/

                        // Crea una nuova riga per ciascun WBSElement
                        var oRow = new sap.m.ColumnListItem();

                        // Aggiungo la colonna con la descrizione del progetto
                        var oVBox = new sap.m.VBox();

                        var sWAInfo = "";
                        var sWA = aTimeSheetEntriesForWBSElement[0].PersonWorkAgreement || "";
                        var sCompany = aTimeSheetEntriesForWBSElement[0].CompanyCode || "";
                        if (sWA || sCompany) {
                            sWAInfo = `\nWA: ${sWA || '-'}` + (sCompany ? ` - ${sCompany}` : "");
                        }

                        var oWBSDescriptionText = new sap.m.Text({
                            text: `${aTimeSheetEntriesForWBSElement[0].ProjectDescription}\n${aTimeSheetEntriesForWBSElement[0].WBSDescription}${sWAInfo}`
                        });
                        oVBox.addItem(oWBSDescriptionText);

                        // Se esiste, aggiungo l'overtime category
                        let overtimeCatDescr = "Regular Hours";
                        if (aTimeSheetEntriesForWBSElement[0].TimeSheetOvertimeCategory.length > 0) {
                            overtimeCatDescr = await that.getOvertimeCategoryName(aTimeSheetEntriesForWBSElement[0].TimeSheetOvertimeCategory);
                        }
                        var oSubtextText = new sap.m.Text({
                            //text: `${aTimeSheetEntriesForWBSElement[0].TimeSheetOvertimeCategory}`
                            text: overtimeCatDescr
                        }).addStyleClass('subtext');
                        oVBox.addItem(oSubtextText);
                        oVBox.data("WBSElement", aTimeSheetEntriesForWBSElement[0].WBSElement);
                        oVBox.data("OvertimeCategory", aTimeSheetEntriesForWBSElement[0].TimeSheetOvertimeCategory);
                        oVBox.data("WorkAgreement", aTimeSheetEntriesForWBSElement[0].PersonWorkAgreement || "");

                        oRow.addCell(oVBox);

                        var cellSums = 0;
                        // Aggiungi le colonne per i giorni
                        for (var i = 1; i <= daysInMonth; i++) {
                            var sRecordedQuantity = "";
                            var sRecordedHours = "";
                            var sQtyToText = "";
                            var sNoteText = "";
                            var sWorkLocation = "";
                            var sCellStatus = "";
                            var sCellEnabled = true;

                            var matchDayDate = new Date(iYear, iMonth - 1, i);
                            var numeroGiorno = matchDayDate.getDay();
                            var matchDay = that.formatDateToISOString(matchDayDate, true);
                            //var dateOnly = matchDay.split("T")[0];
                            var dateOnly = that.formatDateToISOString(new Date(matchDay), false);

                            // Trova il corrispondente oggetto in base a WorkPackageID, Period e FcYear
                            const matchingRecord = aTimeSheetEntriesForWBSElement.find(record => {
                                return (
                                    record.TimeSheetDate === matchDay
                                );
                            });

                            if (matchingRecord) {
                                /*sRecordedQuantity = matchingRecord.RecordedQuantity;
                                sRecordedHours = matchingRecord.RecordedHours;
                                sQtyToText = that.formatQuantity(sRecordedHours);
                                sCellStatus = matchingRecord.YY1_InternalStatus_TIM;
                                cellSums = cellSums + sRecordedHours;
                                if (sCellStatus != "10" && sCellStatus != '50') {
                                    sCellEnabled = false;
                                }*/

                                // Estrai tutte le quantitÃ  (sQuantity) da questi record
                                const allRecords = aTimeSheetEntriesForWBSElement.filter(record => {
                                    return (
                                        record.TimeSheetDate === matchDay
                                    );
                                });
                                const quantities = allRecords.map(record => record.RecordedQuantity);

                                const noteText = allRecords.map(record => record.TimeSheetNote);
                                if (noteText[0] && noteText[0].trim().length > 0) {
                                    sNoteText = `Note:\n${noteText[0]}`
                                }

                                const TimeSheetWrkLocCode = allRecords.map(record => record.TimeSheetWrkLocCode);
                                if (TimeSheetWrkLocCode[0]) {
                                    //sWorkLocation = "<b>Work Location:</b>\n" + this.getWorkLocationName(TimeSheetWrkLocCode[0]);
                                    sWorkLocation = `Work Location:\n${this.getWorkLocationName(TimeSheetWrkLocCode[0])}`;
                                }

                                // Ora puoi calcolare la somma delle quantitÃ  o fare qualsiasi altra elaborazione necessaria
                                const totalQuantity = quantities.reduce((total, quantity) => total + parseFloat(quantity), 0);
                                sQtyToText = that.formatQuantity(totalQuantity);

                                sCellStatus = matchingRecord.YY1_InternalStatus_TIM;
                                // Escludo il reject dal totale per ri
                                if (sCellStatus != '50') {
                                    cellSums = cellSums + totalQuantity;
                                }

                                if (sCellStatus != "10" && sCellStatus != '50') {
                                    sCellEnabled = false;
                                }
                            }

                            let sToolTip = sWorkLocation && sNoteText
                                ? `${sWorkLocation}\n\n${sNoteText}`
                                : sWorkLocation || sNoteText || "";

                            var oCell = new sap.m.Button({
                                //text: sRecordedHours, // Inizialmente vuoto, verrÃ  riempito successivamente
                                //text: sRecordedQuantity, // Inizialmente vuoto, verrÃ  riempito successivamente
                                text: sQtyToText, // Inizialmente vuoto, verrÃ  riempito successivamente
                                press: this.onOpenPopoverDialog,
                                tooltip: sToolTip,
                                enabled: sCellEnabled
                            });

                            if (!sCellEnabled) {
                                oCell.detachPress(this.onOpenPopoverDialog);
                            }
                            //controllo se Ã¨ un giorno festivo di calendario
                            const foundHoliday = FactoryCalendar.find(item => item.PublicHolidayDate === dateOnly);

                            //Cella disabilitata in caso di sabato, domenica, festivo o fuori data del contratto
                            if ((numeroGiorno === 0 || numeroGiorno === 6) || foundHoliday ||
                                //dateOnly < matchingWA.WorkAssignmentStartDate || dateOnly > matchingWA.WorkAssignmentEndDate) {
                                dateOnly < globalUserInfo.ValidFrom || dateOnly > globalUserInfo.ValidTo) {
                                oCell.addStyleClass("giorniFestivi");
                                oCell.detachPress(this.onOpenPopoverDialog);
                            } else {
                                oCell.addStyleClass("giorniNonFestivi");
                            }

                            if (matchingRecord) {
                                var cellModel = new sap.ui.model.json.JSONModel(matchingRecord);
                                if (!cellModel.oData.CompanyCode) {
                                    cellModel.oData.CompanyCode = matchingWA.CompanyCode;
                                }
                                oCell.setModel(cellModel);

                                /*//Cambio colore in caso di record rigettato
                                if (matchingRecord.YY1_InternalStatus_TIM === '50') {
                                    oCell.addStyleClass("rejectedDays");
                                }*/

                                switch (matchingRecord.YY1_InternalStatus_TIM) {
                                    case '20': // Sent for approval Manager
                                    case '70': // Waiting for approval
                                        oCell.addStyleClass("waitingApprovalDays");
                                        break;
                                    case '30': // Sent for approval HR
                                        oCell.addStyleClass("submittedDays");
                                        break;
                                    case '40': // Approved by HR
                                        oCell.addStyleClass("approvedDays");
                                        break;
                                    case '80': // Posted
                                    case '90': // Posted (No Billable)
                                        oCell.addStyleClass("postedDays");
                                        break;
                                    case '50': // Rejected
                                        oCell.addStyleClass("rejectedDays");
                                        break;
                                    default:
                                        break;
                                }

                            } else {

                                var cellData = {};
                                cellData.CompanyCode = aTimeSheetEntriesForWBSElement[0].CompanyCode;
                                cellData.PersonWorkAgreementExternalID = aTimeSheetEntriesForWBSElement[0].PersonWorkAgreementExternalID;
                                cellData.PersonWorkAgreement = aTimeSheetEntriesForWBSElement[0].PersonWorkAgreement;
                                cellData.TimeSheetRecord = "";
                                cellData.TimeSheetDate = matchDay;
                                cellData.TimeSheetDateDay = matchDay;
                                cellData.TimeSheetStatus = "";
                                cellData.TimeSheetOperation = "C";
                                cellData.TimeSheetNote = "";
                                cellData.TimeSheetOvertimeCategory = aTimeSheetEntriesForWBSElement[0].TimeSheetOvertimeCategory; //overtimeRegularHours; //Regular Hours
                                cellData.TimeSheetWrkLocCode = "Z002"; //Remote Working
                                cellData.YY1_InternalStatus_TIM = "10";
                                cellData.YY1_InternalStatus_TIMF = 3;
                                cellData.YY1_InternalStatus_TIMT = "";
                                cellData.RecordedHours = null;
                                cellData.RecordedQuantity = null;
                                cellData.HoursUnitOfMeasure = "H";

                                cellData.WBSElement = aTimeSheetEntriesForWBSElement[0].WBSElement;
                                cellData.ActivityType = aTimeSheetEntriesForWBSElement[0].ActivityType;
                                cellData.Project = aTimeSheetEntriesForWBSElement[0].Project;
                                cellData.ProjectDescription = aTimeSheetEntriesForWBSElement[0].ProjectDescription;
                                cellData.WBSDescription = aTimeSheetEntriesForWBSElement[0].WBSDescription;

                                // Aggiunta nuovi campi
                                cellData.YY1_EmpCompanyCode_TIM = aTimeSheetEntriesForWBSElement[0].YY1_EmpCompanyCode_TIM;
                                cellData.YY1_ProjProfitCValue_TIM = aTimeSheetEntriesForWBSElement[0].YY1_ProjProfitCValue_TIM;
                                cellData.YY1_ProjectCompanyCod_TIM = aTimeSheetEntriesForWBSElement[0].YY1_ProjectCompanyCod_TIM;
                                cellData.YY1_EmpCostCenterValue_TIM = aTimeSheetEntriesForWBSElement[0].YY1_EmpCostCenterValue_TIM;

                                var cellModel = new sap.ui.model.json.JSONModel(cellData);

                                oCell.setModel(cellModel);
                            }

                            // Disabilito la riga se Ã¨ un Overtime/Timeoff o se Ã¨ un progetto interno
                            if (
                                (cellModel.oData.TimeSheetOvertimeCategory !== overtimeRegularHours &&
                                    cellModel.oData.TimeSheetOvertimeCategory !== overtimeExtraEffort) ||
                                (isProjectInternal !== undefined && isProjectInternal !== null && isProjectInternal)
                            ) {
                                oCell.mProperties.enabled = false;
                                //oCell.aCustomStyleClasses[0] = 'giorniNonFestivi';
                            }

                            // Disabilito la riga se il Periodo Contabile Ã¨ chiuso
                            if (freezeTimesheet) {
                                oCell.mProperties.enabled = false;
                            }

                            oRow.addCell(oCell);
                        }

                        //aggiungo cella per il totale
                        var checkEffort = 0;
                        if (cellModel.oData.TimeSheetOvertimeCategory === overtimeRegularHours) {
                            const sRowWorkAgreement = aTimeSheetEntriesForWBSElement[0].PersonWorkAgreement || aTimeSheetEntriesForWBSElement[0].PersonWorkAgreementExternalID || "";
                            let matchingProj = StaffingList.find(project =>
                                project.WorkPackageID === aTimeSheetEntriesForWBSElement[0].WBSElement &&
                                (project.StaffedEmployee === sRowWorkAgreement || project.StaffedEmployeeExternalID === sRowWorkAgreement)
                            );

                            if (!matchingProj) {
                                matchingProj = StaffingList.find(project => project.WorkPackageID === aTimeSheetEntriesForWBSElement[0].WBSElement);
                            }

                            if (matchingProj) {
                                checkEffort = parseFloat(matchingProj.StaffedEffort);
                            }
                        }

                        if (checkEffort > 0) {
                            var oTotalRowColumn = new sap.m.Button({
                                text: `${cellSums}/${parseFloat(checkEffort)}`
                            });
                        } else {
                            var oTotalRowColumn = new sap.m.Button({
                                text: cellSums
                            });
                        }

                        // Aggiungo la colonna per eliminare l'intera riga
                        var oDeleteCell = new sap.m.Button({
                            icon: "sap-icon://delete", // Icona "delete" nel bottone
                            press: this.onDelete,
                        }).addStyleClass("deleteIcon deleteIcon2");

                        if (
                            (cellModel.oData.TimeSheetOvertimeCategory !== overtimeRegularHours &&
                                cellModel.oData.TimeSheetOvertimeCategory !== overtimeExtraEffort) ||
                            (isProjectInternal !== undefined && isProjectInternal !== null && isProjectInternal)
                        ) {
                            oDeleteCell.mProperties.enabled = false;
                            oTotalRowColumn.mProperties.enabled = false;
                        }

                        if (freezeTimesheet) {
                            oCell.mProperties.enabled = false;
                            oDeleteCell.mProperties.enabled = false;
                            oTotalRowColumn.mProperties.enabled = false;
                        }

                        oRow.addCell(oTotalRowColumn);
                        oRow.addCell(oDeleteCell);

                        oTable.addItem(oRow);
                    }
                }

                //** AGGIUNTA FOOTER CON TOTALI */ 
                //** COSTRUZIONE STRUTTURA FOOTER */
                var oFooterRow = new sap.m.ColumnListItem();

                // Aggiungo la colonna con la descrizione del progetto
                var oLabel = new sap.m.Label({
                    text: "Total Hours"
                });

                oFooterRow.addCell(oLabel);
                var footerSums = 0;
                // Aggiungi le colonne per i giorni
                for (var i = 1; i <= daysInMonth; i++) {
                    var sQtyToText = "";

                    var matchDayDate = new Date(iYear, iMonth - 1, i);
                    var numeroGiorno = matchDayDate.getDay();
                    var matchDay = that.formatDateToISOString(matchDayDate, true);

                    // Trova tutti i record corrispondenti al giorno che ti interessa
                    const matchingRecords = sTimesheetArray.filter(record => {
                        return record.TimeSheetDate === matchDay &&
                            record.YY1_InternalStatus_TIM !== '50';
                    });

                    if (matchingRecords) {
                        // Estrai tutte le quantitÃ  (sQuantity) da questi record
                        const quantities = matchingRecords.map(record => record.RecordedQuantity);

                        // Ora puoi calcolare la somma delle quantitÃ  o fare qualsiasi altra elaborazione necessaria
                        const totalQuantity = quantities.reduce((total, quantity) => total + parseFloat(quantity), 0);

                        sQtyToText = that.formatQuantity(totalQuantity);
                        footerSums = footerSums + totalQuantity;
                    }

                    var oCell = new sap.m.Button({
                        text: sQtyToText,
                    });

                    var dateOnly = that.formatDateToISOString(new Date(matchDay), false);
                    const foundHoliday = FactoryCalendar.find(item => item.PublicHolidayDate === dateOnly);

                    //Cella colorata in caso di sabato, domenica o festivo
                    if ((numeroGiorno === 0 || numeroGiorno === 6) || foundHoliday) {
                        oCell.addStyleClass("giorniFestivi");
                    } else {
                        oCell.addStyleClass("giorniNonFestivi");
                    }

                    oFooterRow.addCell(oCell);
                }
                //aggiungo cella per il totale nel footer
                var oCell = new sap.m.Button({
                    //text: footerSums,
                    text: `${footerSums}/${totalWorkingHours}`,
                });
                oFooterRow.addCell(oCell);

                // Aggiungo lo spazio della cella per eliminare i record
                //var oDeleteCell = new sap.m.Button().addStyleClass("deleteIcon deleteIcon2");
                //oFooterRow.addCell(oDeleteCell);

                //Inizializzo la tabella
                var oTableFooter = this.getView().byId("idFooter");
                oTableFooter.removeAllColumns();
                oTableFooter.removeAllItems();
                var oColumn = new sap.m.Column({
                    width: "17em",
                    hAlign: sap.ui.core.TextAlign.Center,
                    header: new Text({
                        text: "",
                    }),
                });
                oTableFooter.addColumn(oColumn);

                // Aggiunta spazio per allineamento dell'etichetta
                /*var oWBSDescriptionColumn = new sap.m.Column({
                    header: new Text({
                        text: ""
                    })
                });
                oTableFooter.addColumn(oWBSDescriptionColumn);*/

                //Aggiungo le colonne alla tabella (tante colonne quanti i giorni del mese) parte da 0 per aggiungere la cella del totale
                for (var i = 1; i <= daysInMonth; i++) {
                    var dataSpecifica = new Date(iYear, iMonth - 1, i);
                    var oColumn = new sap.m.Column({
                        width: "3em",
                        hAlign: sap.ui.core.TextAlign.Center,
                        header: new Text({
                            text: "",
                        }),
                    });

                    oTableFooter.addColumn(oColumn);
                }

                //aggiungo colonna per il totale nel footer
                var oTotalRowColumn = new sap.m.Column({
                    width: "5em",
                    hAlign: sap.ui.core.TextAlign.Center,
                    header: new Text({
                    }),
                });
                oTableFooter.addColumn(oTotalRowColumn);

                // Aggiunta colonna "Elimina Riga"
                var oDeleteColumn = new sap.m.Column({
                    width: "3em"
                });
                oTableFooter.addColumn(oDeleteColumn);

                oTableFooter.addItem(oFooterRow);
            },

            onBeforeExport: function (oEvt) {
                var mExcelSettings = oEvt.getParameter("exportSettings");

                // Disable Worker as Mockserver is used in Demokit sample
                mExcelSettings.worker = false;
            },
            onExit: function () {
                this._oMockServer.stop();
            },

            onOpenPopoverDialog: function (oEvent) {
                var that = globalThis.thatHome;
                var oButton = oEvent.getSource(),
                    oModel = oButton.getModel(),
                    oView = that.getView();

                //////////////////////////////////////////
                // COLORI CELLA E COLONNA
                // Ottieni la riga associata alla cella
                var oRow = oButton.getParent();

                // Ottieni l'indice della cella all'interno della riga
                var iCellIndex = oRow.indexOfCell(oButton);

                // Ottieni la tabella a cui appartiene la cella
                var oTable = oRow.getParent();

                // Ottieni l'elenco di tutte le righe della tabella
                var aRows = oTable.getItems();

                // Itera su tutte le righe e aggiorna le celle nella stessa colonna
                aRows.forEach(function (oTableRow) {
                    var oCellsInSameColumn = oTableRow.getCells();
                    var oCellInSameColumn = oCellsInSameColumn[iCellIndex];

                    if (oCellInSameColumn) {
                        // Applica uno stile CSS per cambiare il colore di sfondo
                        // oCellInSameColumn.addStyleClass("columnHoveredStyle");
                    }
                });

                // Accedi alle colonne della tabella
                var aColumns = oTable.getColumns();

                // Ottieni la colonna corrispondente alla cella dati
                var oColumn = aColumns[iCellIndex];

                // Ottieni l'header della colonna
                var oHeaderCell = oColumn.getHeader();

                if (oHeaderCell) {
                    // Applica uno stile CSS per cambiare il colore di sfondo solo alla cella dell'header
                    oHeaderCell.addStyleClass("columnHoveredStyle");
                }

                //////////////////////////


                // If the Popover is already initialized, destroy it
                if (that._pPopover) {
                    that._pPopover.then(function (oPopover) {
                        oPopover.destroy();
                        //oHeaderCell.removeStyleClass("columnHoveredStyle");
                    });
                    that._pPopover = null;
                    // oHeaderCell.removeStyleClass("columnHoveredStyle");
                }

                // Create the Popover
                that._pPopover = Fragment.load({
                    id: oView.getId(),
                    name: "com.lobra.timesheetview.view.Popup",
                    controller: that
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);

                    if (oModel) {
                        oPopover.setModel(oModel, "timesheetSingleCell");
                    }

                    oPopover.attachAfterClose(function () {
                        oPopover.destroy(); // Destroy the fragment when it closes
                        oHeaderCell.removeStyleClass("columnHoveredStyle");
                    });

                    return oPopover;
                });

                that._pPopover.then(function (oPopover) {
                    oPopover.setPlacement(sap.m.PlacementType.Auto);
                    oPopover.openBy(oButton);
                });
            },

            _closeDialog: function () {
                this.oDialog.close();
            },

            addProject: async function (oEvent) {
                var that = globalThis.thatHome;

                var freezeTimesheet = await this.checkFreezeTimesheet(globalUserInfo.isExternal, currentMonthValue);
                if (freezeTimesheet) {
                    MessageBox.error("Impossibile procedere! Periodo contabile chiuso.");
                    return;
                }

                let addProjectType = oEvent.getSource().getKey();
                that.onComboBoxSelectionChange(addProjectType);
            },

            onComboBoxSelectionChange: async function (sAddProjectType) {
                var that = globalThis.thatHome;
                var oTable = that.getView().byId("idTable");
                //var selectedItem = oEvent.getSource().getSelectedItem();
                var selectedItem = that.getView().byId("idComboBoxAddProject").getSelectedItem();

                //Svuoto il contenuto della cella
                //oEvent.getSource().setSelectedKey(null);
                that.getView().byId("idComboBoxAddProject").setSelectedKey(null);

                var selectedOvertimeCategory = "";
                switch (sAddProjectType) {
                    case 'regularHours':
                        selectedOvertimeCategory = overtimeRegularHours;
                        break;
                    case 'extraEffort':
                        await MessageBox.information(`Attenzione! queste ore non sono valide ai fini dei calcoli della consuntivazione mensile.`, {
                            actions: ["Ok", MessageBox.Action.CLOSE],
                            emphasizedAction: "Ok",
                            onClose: function (sAction) {
                            }
                        })
                        selectedOvertimeCategory = overtimeExtraEffort;
                        break;
                    default:
                        selectedOvertimeCategory = overtimeRegularHours;
                        break;
                };

                if (selectedItem) {
                    // Estraggo il progetto selezionato
                    //var oModel = oEvent.getSource().getModel("StaffingListEmployee");
                    var oModel = selectedItem.getModel("StaffingListEmployee");
                    var oContext = selectedItem.getBindingContext("StaffingListEmployee");
                    var oSelectedProject = oModel.getProperty(oContext.getPath());
                    oSelectedProject.TimeSheetOvertimeCategory = selectedOvertimeCategory;

                    //** CONTROLLO SE GIA ESISTE IL PROGETTO CHE STIAMO INSERENDO */
                    var oRows = oTable.getItems();
                    var targetWorkAgreement = oSelectedProject.StaffedEmployee || "";

                    for (var i = 0; i < oRows.length; i++) {
                        let wbsElement = oRows[i].getCells()[0].data("WBSElement");
                        let overtimeCategory = oRows[i].getCells()[0].data("OvertimeCategory");
                        let workAgreementRow = oRows[i].getCells()[0].data("WorkAgreement") || "";

                        if (oSelectedProject.WorkPackageID == wbsElement && overtimeCategory === selectedOvertimeCategory && workAgreementRow === targetWorkAgreement) {
                            MessageToast.show('Progetto giÃ  inserito per questo mese');
                            return;
                        }
                    }
                    //**  FINE CONTROLLO SE GIA ESISTE IL PROGETTO CHE STIAMO INSERENDO */

                    // Estraggo il Workassignment corretto
                    var firstDayOfMonth = new Date(currentMonthValue.getFullYear(), currentMonthValue.getMonth(), 1);
                    var lastDayOfMonth = new Date(currentMonthValue.getFullYear(), currentMonthValue.getMonth() + 1, 0);

                    let matchingWA = globalUserInfo.WorkAssignments.find(el =>
                        el.PersonWorkAgreement === oSelectedProject.StaffedEmployee &&
                        lastDayOfMonth >= (new Date(el.WorkAssignmentStartDate)) &&
                        firstDayOfMonth <= (new Date(el.WorkAssignmentEndDate)));

                    if (globalUserInfo.isExternal) {
                        matchingWA = globalUserInfo.WorkAssignments.find(el =>
                            el.PersonWorkAgreement === oSelectedProject.StaffedEmployee &&
                            el.CompanyCode === oSelectedProject.ProjectCompanyCode);

                        //Restituire errore per utente esterno che carica su un progetto di una company differente
                        if (!matchingWA || matchingWA === null || matchingWA === undefined) {
                            var prjCompanyCode = await that.getCompanyCode('', `CompanyCode eq '${oSelectedProject.ProjectCompanyCode}'`);
                            //MessageBox.error(`La risorsa non ha un WorkAgreement relativo alla company del progetto selezionato (${oSelectedProject.ProjectCompanyCode} - ${this.getCompanyCodeDescription(oSelectedProject.ProjectCompanyCode)})`);
                            MessageBox.error(`La risorsa non risulta assegnata alla stessa Company del progetto selezionato (${oSelectedProject.ProjectCompanyCode} - ${this.getCompanyCodeDescription(oSelectedProject.ProjectCompanyCode)})`);
                            return;
                        }
                    }

                    //Inizializzo il calendario di Fabbrica
                    let filterCalendar = `CalendarYear eq '${currentMonthValue.getFullYear()}'`
                    let FactoryCalendar = await this.getFactoryCalendar(filterCalendar);

                    //Creo la riga di progetto
                    var oRow = new sap.m.ColumnListItem();

                    // Estrai il giorno, il mese e l'anno dalla data
                    let month = currentMonthValue.getMonth() + 1;
                    let year = currentMonthValue.getFullYear();

                    var numberDays = new Date(year, month, 0).getDate();

                    // Aggiunta colonna descrizione del progetto
                    var oVBox = new sap.m.VBox();

                    var sWAHeader = "";
                    var sSelectedWA = oSelectedProject.StaffedEmployee || (matchingWA ? matchingWA.PersonWorkAgreement : "");
                    var sSelectedCompany = matchingWA ? matchingWA.CompanyCode : (oSelectedProject.ProjectCompanyCode || "");
                    if (sSelectedWA || sSelectedCompany) {
                        sWAHeader = `\nWA: ${sSelectedWA || '-'}` + (sSelectedCompany ? ` - ${sSelectedCompany}` : "");
                    }

                    var oWBSDescriptionText = new sap.m.Text({
                        text: `${oSelectedProject.ProjectName}\n${oSelectedProject.WPname}${sWAHeader}`
                    });
                    oVBox.addItem(oWBSDescriptionText);

                    // Se esiste, aggiungo l'overtime category
                    let overtimeCatDescr = "Regular Hours";
                    if (oSelectedProject.TimeSheetOvertimeCategory.length > 0) {
                        overtimeCatDescr = await that.getOvertimeCategoryName(oSelectedProject.TimeSheetOvertimeCategory);
                    }
                    var oSubtextText = new sap.m.Text({
                        text: overtimeCatDescr
                    }).addStyleClass('subtext');
                    oVBox.addItem(oSubtextText);
                    oVBox.data("WBSElement", oSelectedProject.WorkPackageID);
                    oVBox.data("OvertimeCategory", selectedOvertimeCategory);
                    oVBox.data("WorkAgreement", sSelectedWA || "");

                    oRow.addCell(oVBox);

                    // Aggiunta colonne per i giorni
                    for (var i = 1; i <= numberDays; i++) {

                        var currentDate = new Date(year, month - 1, i);
                        var numberDay = currentDate.getDay();
                        var matchDay = this.formatDateToISOString(currentDate, true);

                        var oCell = new sap.m.Button({
                            text: "", // Inizialmente vuoto, verrÃ  riempito successivamente
                            press: this.onOpenPopoverDialog
                        });

                        // Controllo se Ã¨ un giorno festivo di calendario
                        //var dateOnly = matchDay.split("T")[0];
                        var dateOnly = that.formatDateToISOString(new Date(matchDay), false);
                        const foundHoliday = FactoryCalendar.find(item => item.PublicHolidayDate === dateOnly);

                        // Cella disabilitata in caso di sabato, domenica, festivo o fuori data del contratto
                        if ((numberDay === 0 || numberDay === 6) || foundHoliday ||
                            //dateOnly < matchingWA.WorkAssignmentStartDate || dateOnly > matchingWA.WorkAssignmentEndDate) {
                            dateOnly < globalUserInfo.ValidFrom || dateOnly > globalUserInfo.ValidTo) {
                            oCell.addStyleClass("giorniFestivi");
                            oCell.detachPress(this.onOpenPopoverDialog);
                        } else {
                            oCell.addStyleClass("giorniNonFestivi");
                        }

                        var cellData = {};

                        //cellData.CompanyCode = oSelectedProject.StaffedEmpCompanyCode;
                        cellData.CompanyCode = matchingWA.CompanyCode || oSelectedProject.StaffedEmpCompanyCode;
                        cellData.PersonWorkAgreementExternalID = oSelectedProject.StaffedEmployeeExternalID;
                        cellData.PersonWorkAgreement = oSelectedProject.StaffedEmployee;
                        cellData.TimeSheetRecord = "";
                        cellData.TimeSheetDate = matchDay;
                        cellData.TimeSheetDateDay = matchDay;
                        cellData.TimeSheetStatus = "";
                        cellData.TimeSheetOperation = "C";
                        cellData.TimeSheetNote = "";
                        cellData.TimeSheetWrkLocCode = "Z002"; //Remote Working
                        cellData.TimeSheetOvertimeCategory = selectedOvertimeCategory; //Regular Hours
                        cellData.YY1_InternalStatus_TIM = "10";
                        cellData.YY1_InternalStatus_TIMF = 3;
                        cellData.YY1_InternalStatus_TIMT = "";
                        cellData.RecordedHours = null;
                        cellData.RecordedQuantity = null;
                        cellData.HoursUnitOfMeasure = "H";
                        cellData.WBSElement = oSelectedProject.WorkPackageID;
                        cellData.ActivityType = oSelectedProject.ActivityType;
                        cellData.Project = oSelectedProject.ProjectID;
                        cellData.ProjectDescription = oSelectedProject.ProjectName;
                        cellData.WBSDescription = oSelectedProject.WPname;

                        // Aggiunta nuovi campi
                        cellData.YY1_EmpCompanyCode_TIM = matchingWA.CompanyCode || oSelectedProject.StaffedEmpCompanyCode;
                        cellData.YY1_ProjProfitCValue_TIM = oSelectedProject.ProfitCenter;
                        cellData.YY1_ProjectCompanyCod_TIM = oSelectedProject.ProjectCompanyCode;
                        cellData.YY1_EmpCostCenterValue_TIM = matchingWA.CostCenter || "";

                        var cellModel = new sap.ui.model.json.JSONModel(cellData);

                        oCell.setModel(cellModel);
                        oRow.addCell(oCell);
                    }

                    // Aggiunta colonna per il totale 
                    var cellSums = 0;
                    if (selectedOvertimeCategory === overtimeRegularHours) {
                        var checkEffort = oSelectedProject.StaffedEffort;
                        cellSums = `${cellSums}/${parseFloat(checkEffort)}`;
                    }

                    var oTotalRowColumn = new sap.m.Button({
                        text: cellSums
                    });
                    oRow.addCell(oTotalRowColumn);

                    // Aggiunta colonna "Elimina Riga"
                    var oDeleteCell = new sap.m.Button({
                        icon: "sap-icon://delete",
                        press: this.onDelete,
                    }).addStyleClass("deleteIcon deleteIcon2");
                    oRow.addCell(oDeleteCell);

                    oTable.addItem(oRow);
                    var oComboBox = this.getView().byId("idComboBoxAddProject");
                    oComboBox.setSelectedKey("");
                } else {
                    MessageBox.error("Seleziona un progetto prima di procedere.");
                }
            },

            highlightColumn: function (oTable, columnIndex) {
                var oRows = oTable.getRows();

                for (var i = 0; i < oRows.length; i++) {
                    var oRow = oRows[i];
                    var oCells = oRow.getCells();
                    var oCell = oCells[columnIndex];

                    oCell.addStyleClass("highlightedColumn"); // Aggiungi una classe CSS personalizzata
                }
            },

            onComboBoxChange: function (oEvent) {
                var oComboBox = oEvent.getSource();
                var sValue = oComboBox.getValue(); // Ottieni il valore immesso dall'utente
                var oItem = oComboBox.getSelectedItem();

                if (!oItem) {
                    // Se non c'Ã¨ un elemento selezionato, il valore immesso non Ã¨ valido
                    // Puoi reimpostare il valore della ComboBox a vuoto o a un valore predefinito
                    oComboBox.setValue(""); // Imposta il campo a vuoto
                    //oComboBox.setValueState(sap.ui.core.ValueState.Error); // Puoi anche impostare uno stato di errore, se necessario
                    //oComboBox.setValueStateText("Valore non valido"); // Testo dello stato di errore, se necessario
                }
            },

            //** FUNZIONI POPUP */
            //***************** */
            formatTimeFromQty: function (sQty) {
                var that = globalThis.thatHome;
                if (!sQty) {
                    return "00:00"; // Imposta un valore predefinito se la quantitÃ  Ã¨ vuota o nulla
                }

                // Supponiamo che la quantitÃ  sia in ore, quindi possiamo convertirla direttamente in HH:mm
                var iHours = parseInt(sQty);
                var iMinutes = (sQty - iHours) * 60;

                // Formatta le ore e i minuti in HH:mm
                var sHours = iHours.toString().padStart(2, '0'); // Aggiunge uno zero se necessario
                var sMinutes = iMinutes.toString().padStart(2, '0');

                return sHours + ":" + sMinutes;
            },

            /*getWorkLocationName: function (sWorkLocationCode) {
                var that = globalThis.thatHome;
                let WorkLocationList = that.getView().getModel("WorkLocationList").oData;

                const matchingWL = WorkLocationList.find(location => location.TimeSheetWrkLocCode === sWorkLocationCode);
                if (matchingWL) {
                    return matchingWL.TimeSheetWrkLocCodeName;
                } else {
                    return;
                }
            },*/

            onClosePopup: function (oEvent) {
                var that = globalThis.thatHome;
                //Estraggo i dati
                var TimesheetSingleCell = oEvent.getSource().getModel("timesheetSingleCell").oData;

                //Aggiorno i dati immessi dall'utente
                let updateCheck = that.updateTimesheetInfoFromPopup(TimesheetSingleCell, false);

                if (updateCheck) {
                    //Popup vuoi uscire senza salvare i dati
                    if (window.confirm("Vuoi uscire senza salvare?")) {
                        // L'utente ha cliccato su "Si", puoi gestire l'uscita qui
                        oEvent.getSource().destroy();
                    }
                } else {
                    oEvent.getSource().destroy();
                }
            },

            onSavePopup: function (oEvent) {
                var that = globalThis.thatHome;
                var oView = that.getView();

                var oModelName = "TimesheetInfoEmployee";
                var oModelTS = oView.getModel(oModelName);
                var TimesheetInfoEmployee = oModelTS.oData;

                var oTableMain = this.getView().byId("idTable");
                var aItems = oTableMain.getItems();

                var datePicker = that.getView().byId('timesheetDateFilter');
                var firstDateValue = datePicker.getDateValue();
                var iteratorDay = new Date(firstDateValue.getFullYear(), firstDateValue.getMonth(), firstDateValue.getDate());
                var secondDateValue = datePicker.getSecondDateValue();
                var cells = oEvent.oSource.oParent.oParent._oOpenBy.oParent.mAggregations.cells;


                for (var d = iteratorDay; d < secondDateValue; d.setDate(d.getDate() + 1)) {
                    var TimesheetSingleCell = cells.find((cell) => {
                        if (!cell.oModels.undefined) {
                            // Se TimeSheetDate Ã¨ null, continua con la prossima iterazione
                            return false;
                        }

                        return cell.oModels.undefined.oData.TimeSheetDate > that.formatDateToISOString(d, false);
                    });
                    var buttonCell = TimesheetSingleCell;
                    TimesheetSingleCell = TimesheetSingleCell.oModels.undefined.oData;
                    var TimesheetSingleCellBackup = JSON.parse(JSON.stringify(TimesheetSingleCell));

                    if (buttonCell.aCustomStyleClasses[0] === "giorniFestivi" || !buttonCell.getEnabled()) {
                        continue;
                    }
                    that.saveInputData(TimesheetInfoEmployee, aItems, TimesheetSingleCell, TimesheetSingleCellBackup, buttonCell);
                }

                oEvent.getSource().getParent().getParent().close();
            },

            updateTimesheetInfoFromPopup: function (sTimeSheetRecord, update) {
                var that = globalThis.thatHome;
                let updateCheck = false;

                // Aggiorno RecordedHours e RecordedQuantity
                var hoursString = that.getView().byId('popupTimePicker').getValue();
                var hoursToQty = that.convertHoursToQuantity(hoursString);
                if (hoursToQty > 0 && hoursToQty) {

                    if (hoursToQty && (hoursToQty != sTimeSheetRecord.RecordedHours)) {
                        if (update) {
                            sTimeSheetRecord.RecordedHours = hoursToQty;
                        }
                        updateCheck = true;
                    }
                    hoursToQty = that.convertHoursToQuantity(hoursString);
                    if (hoursToQty && (hoursToQty != sTimeSheetRecord.RecordedQuantity)) {
                        if (update) {
                            sTimeSheetRecord.RecordedQuantity = hoursToQty;
                        }
                        updateCheck = true;
                    }
                } else {
                    //Se l'orario Ã¨ stato cancellato o settato a zero cancello il record
                    sTimeSheetRecord.RecordedHours = "";
                    sTimeSheetRecord.RecordedQuantity = "";
                    sTimeSheetRecord.TimeSheetOperation = "D";
                }

                // Aggiorno TimeSheetWrkLocCode
                var workLocKey = that.getView().byId('popupWorkLocation').getSelectedKey();
                if (workLocKey.length > 0 && (workLocKey != sTimeSheetRecord.TimeSheetWrkLocCode)) {
                    if (update) {
                        sTimeSheetRecord.TimeSheetWrkLocCode = workLocKey;
                    }
                    updateCheck = true;
                }

                // Aggiorno TimeSheetNote
                var note = that.getView().byId('popupNote').getValue();
                if (note != sTimeSheetRecord.TimeSheetNote) {
                    if (update) {
                        sTimeSheetRecord.TimeSheetNote = note;
                    }
                    updateCheck = true;
                }

                // Rimuovo lo stato di Reject se sto aggiornando il record
                if (update && sTimeSheetRecord.YY1_InternalStatus_TIM === '50') {
                    sTimeSheetRecord.YY1_InternalStatus_TIM === '10';
                }

                return updateCheck;
            },

            convertHoursToQuantity: function (hoursString) {
                // Split dell'orario in ore e minuti
                const [hours, minutes] = hoursString.split(':').map(Number);

                // Calcolo della quantitÃ 
                const quantity = hours + minutes / 60;
                return quantity;
            },

            convertQuantityToHours: function (quantity) {
                if (typeof quantity !== 'number') {
                    return quantity; // Restituisci il valore originale se non Ã¨ un numero
                }

                // Calcola le ore e i minuti
                var hours = Math.floor(quantity);
                var minutes = Math.round((quantity - hours) * 60);

                // Formatta le ore e i minuti con zero a sinistra se necessario
                var formattedHours = hours < 10 ? '0' + hours : hours.toString();
                var formattedMinutes = minutes < 10 ? '0' + minutes : minutes.toString();

                // Restituisci l'orario nel formato HH:MM
                return formattedHours + ':' + formattedMinutes;
            },

            formatQuantity: function (quantity) {
                // Controlla se la quantitÃ  Ã¨ un numero
                if (typeof quantity !== 'number') {
                    return quantity; // Restituisci il valore originale se non Ã¨ un numero
                }

                // Utilizza la funzione toFixed() per arrotondare a 2 decimali
                var formattedQuantity = quantity.toFixed(2);

                // Rimuovi gli zeri inutili dopo il punto decimale
                formattedQuantity = parseFloat(formattedQuantity).toString();

                return formattedQuantity;
            },

            onPopoverBeforeOpen: function (oEvent) {
                var CalendarDayType = UnifiedLibrary.CalendarDayType;
                var datePicker = this.getView().byId("timesheetDateFilter");
                var TimesheetSingleCell = oEvent.getSource().getModel("timesheetSingleCell");
                var selectedDay = new Date(TimesheetSingleCell.oData.TimeSheetDateDay);
                var iteratorDay = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate());
                var endOfMonth = new Date(selectedDay.getFullYear(), selectedDay.getMonth() + 1, 0);
                let FactoryCalendar = this.getModel("factoryCalendar").oData;
                for (var d = iteratorDay; d <= endOfMonth; d.setDate(d.getDate() + 1)) {
                    var matchDay = this.formatDateToISOString(d, true);
                    var dateOnly = matchDay.split("T")[0];
                    const foundHoliday = FactoryCalendar.find(item => item.PublicHolidayDate === dateOnly);
                    if (foundHoliday) {
                        datePicker.addSpecialDate(new DateTypeRange({
                            startDate: UI5Date.getInstance(d.getFullYear(), d.getMonth(), d.getDate()),
                            endDate: UI5Date.getInstance(d.getFullYear(), d.getMonth(), d.getDate()),
                            type: CalendarDayType.NonWorking
                        }));
                    }
                }

                datePicker.setDateValue(selectedDay);
                datePicker.setSecondDateValue(selectedDay);
                datePicker.setMinDate(selectedDay)
                datePicker.setMaxDate(endOfMonth);
            },

            onPopoverAfterOpen: function (oEvent) {
                var oTimePicker = this.getView().byId("popupTimePicker");
                var oSaveButton = this.getView().byId("popupSave");

                oTimePicker.focus();

                // Richiama il gestore di eventi "press" del pulsante "Salva" quando premi "Invio"
                oTimePicker.addEventDelegate({
                    onkeydown: function (e) {
                        if (e.keyCode === 13) {
                            e.preventDefault();
                            oSaveButton.firePress();
                        }
                    }
                });
            },

            onSelectedProject: async function () {
                var that = globalThis.thatHome;

                var selectedWp = that.getView().byId("idComboBoxAddProject").getSelectedKey();

                // Verifico se il progetto Ã¨ Time Material
                var WpBillingTypeList = that.getView().getModel("WpBillingTypeList").getData();
                var prjBillingTypeCheck = WpBillingTypeList.find(project => project.WorkPackage === selectedWp && project.BillingPlanUsageCategory === '2');

                /*var filterBillingType = `WorkPackage eq '${selectedWp}' and BillingPlanUsageCategory eq '2'`;
                var prjBillingTypeCheck = await that.getProjectBillingType(filterBillingType);*/

                if (!globalUserInfo.isExternal && prjBillingTypeCheck) {
                    that.getView().byId("idAddExtraEffort").setProperty("visible", true);
                } else {
                    that.getView().byId("idAddExtraEffort").setProperty("visible", false);
                }
            },

            //***************** */
            //** AZIONI PULSANTI TIMESHEET */
            onSaveDraft: async function (oEvent) {
                var that = globalThis.thatHome;

                that._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.setTitle("Salvataggio Dati");
                    oBusyDialog.open();

                    var inDraftStatus = '10';
                    var requestStatus = "";

                    var firstDayOfMonth = this.formatDateToISOString(new Date(currentMonthValue.getFullYear(), currentMonthValue.getMonth(), 1));
                    var lastDayOfMonth = this.formatDateToISOString(new Date(currentMonthValue.getFullYear(), currentMonthValue.getMonth() + 1, 0));
                    var existingTS = await this.getTimesheet(firstDayOfMonth, lastDayOfMonth, globalUserInfo.WorkAssignments);

                    let TimesheetInfoEmployee = that.getView().getModel("TimesheetInfoEmployee").oData;

                    // Verifico se i dati a sistema sono allineati con quelli appena estratti                
                    TimesheetInfoEmployee = await this.checkExistingTimesheet(TimesheetInfoEmployee, existingTS, true);

                    // Verifico se Ã¨ stato superato il limite di ore staffate
                    var StaffingList = this.getModel("StaffingListEmployee").oData;
                    var checkTotalEffort = that.checkTotalEffort(TimesheetInfoEmployee, StaffingList);

                    if (!checkTotalEffort) {
                        return;
                    }

                    // Filtra i record con il campo "TimeSheetOperation" valorizzato
                    let submitData = TimesheetInfoEmployee.filter(record => {
                        return record.TimeSheetOperation !== "";
                    });

                    if (submitData.length > 0) {

                        for (let i = 0; i < submitData.length; i++) {
                            const element = submitData[i];
                            if (element.TimeSheetRecord.length > 0) {
                                element.TimeSheetOperation = 'U';
                            } else {
                                element.TimeSheetOperation = 'C';
                            }
                        }

                        // Check su ODA per utente esterno
                        var aNoBillableData = [];
                        if (globalUserInfo.isExternal) {

                            // Scarto i progetti "NoBillable" per gli utenti esterni
                            var timeOffSettingsList = this.getModel('TimeOffSettingsList').getData();
                            var aArrayToCheck = [];
                            for (let i = 0; i < submitData.length; i++) {
                                const element = submitData[i];
                                var projectTOSettings = timeOffSettingsList.find(el => el.ProjectID === element.Project);

                                if (projectTOSettings && projectTOSettings !== null && projectTOSettings !== undefined) {
                                    if (projectTOSettings.NoBillableForExternal) {
                                        aNoBillableData.push(element);
                                    }
                                }

                                aArrayToCheck.push(element);
                            }

                            if (aArrayToCheck && aArrayToCheck.length > 0) {
                                var checkResult = await that.checkExternalUserPO(globalUserInfo.Person, aArrayToCheck);
                                submitData = checkResult.data;
                                if (submitData === null) {
                                    MessageBox.error(checkResult.message);
                                    return;
                                }
                            }
                        }

                        var oProgressIndicator = this.getView().byId("progressIndicatorID");
                        var percentageInteger = 0;

                        // Invio i dati
                        if (submitData.length > 0) {
                            requestStatus = await that.postTimesheetInfo(submitData, "", inDraftStatus);
                        }

                        // Salvo i dati NoBillable
                        if (aNoBillableData.length > 0 && (requestStatus === 'success' || requestStatus === 'warning' || requestStatus === '')) {
                            requestStatus = await that.postTimesheetInfo(aNoBillableData, "", inDraftStatus);
                        }

                        if (requestStatus === 'success') {
                            MessageToast.show('Salvataggio Effettuato');
                        } else if (requestStatus === 'warning') {
                            MessageToast.show('Salvataggio parziale dei dati, verificare il log degli esiti');
                        } else {
                            MessageToast.show('Errore! Salvataggio non effettuato');
                        }

                        //Refresh sulla tabella
                        await that.getTimesheetEmployee(currentMonthValue);

                        if (oProgressIndicator && oProgressIndicator.getVisible() === true) {
                            oProgressIndicator.setVisible(false);
                            oProgressIndicator.setDisplayValue(`Totale Record Processati: ${percentageInteger}%`);
                            oProgressIndicator.setPercentValue(percentageInteger);
                        }

                    } else {
                        MessageToast.show('Nessuna modifica da sottomettere');
                    }

                    oBusyDialog.close();
                }.bind(that));
            },

            onSubmitTS: async function (oEvent) {
                var that = globalThis.thatHome;

                that._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.setTitle("Salvataggio Dati");
                    oBusyDialog.open();

                    var toApproveStatus = '20';
                    var requestStatus = "";

                    var firstDayOfMonth = this.formatDateToISOString(new Date(currentMonthValue.getFullYear(), currentMonthValue.getMonth(), 1));
                    var lastDayOfMonth = this.formatDateToISOString(new Date(currentMonthValue.getFullYear(), currentMonthValue.getMonth() + 1, 0));
                    var existingTS = await this.getTimesheet(firstDayOfMonth, lastDayOfMonth, globalUserInfo.WorkAssignments);

                    let TimesheetInfoEmployee = that.getView().getModel("TimesheetInfoEmployee").oData;

                    // Verifico se i dati a sistema sono allineati con quelli appena estratti                
                    TimesheetInfoEmployee = await this.checkExistingTimesheet(TimesheetInfoEmployee, existingTS, true);

                    // Verifico se Ã¨ stato superato il limite di ore staffate
                    var StaffingList = this.getModel("StaffingListEmployee").oData;
                    var checkTotalEffort = that.checkTotalEffort(TimesheetInfoEmployee, StaffingList);

                    if (!checkTotalEffort) {
                        return;
                    }

                    // Filtra i record con il campo "TimeSheetOperation" valorizzato
                    let submitData = TimesheetInfoEmployee.filter(record => {
                        return record.YY1_InternalStatus_TIM === "10";
                        //&& new Date(record.TimeSheetDate) >= firstDayOfMonthYear
                        //&& new Date(record.TimeSheetDate) <= lastDayOfMonthYear;
                    });

                    if (submitData.length > 0) {

                        for (let i = 0; i < submitData.length; i++) {
                            const element = submitData[i];
                            if (element.TimeSheetRecord.length > 0) {
                                element.TimeSheetOperation = 'U';
                            } else {
                                element.TimeSheetOperation = 'C';
                            }
                        }

                        // Check su ODA per utente esterno
                        var aNoBillableData = [];
                        if (globalUserInfo.isExternal) {

                            // Scarto i progetti "NoBillable" per gli utenti esterni
                            var timeOffSettingsList = this.getModel('TimeOffSettingsList').getData();
                            var aArrayToCheck = [];
                            for (let i = 0; i < submitData.length; i++) {
                                const element = submitData[i];
                                var projectTOSettings = timeOffSettingsList.find(el => el.ProjectID === element.Project);

                                if (projectTOSettings && projectTOSettings !== null && projectTOSettings !== undefined) {
                                    if (projectTOSettings.NoBillableForExternal) {
                                        aNoBillableData.push(element);
                                    }
                                }

                                aArrayToCheck.push(element);
                            }

                            if (aArrayToCheck && aArrayToCheck.length > 0) {
                                var checkResult = await that.checkExternalUserPO(globalUserInfo.Person, aArrayToCheck);
                                submitData = checkResult.data;
                                if (submitData === null) {
                                    MessageBox.error(checkResult.message);
                                    return;
                                }
                            }
                        }

                        var oProgressIndicator = this.getView().byId("progressIndicatorID");
                        var percentageInteger = 0;

                        // Salvo i dati da consuntivare
                        if (submitData.length > 0) {
                            requestStatus = await that.postTimesheetInfo(submitData, "", toApproveStatus);
                        }

                        // Salvo i dati NoBillable
                        if (aNoBillableData.length > 0 && (requestStatus === 'success' || requestStatus === 'warning' || requestStatus === '')) {
                            requestStatus = await that.postTimesheetInfo(aNoBillableData, "", toApproveStatus);
                        }

                        if (requestStatus === 'success') {
                            MessageToast.show('Salvataggio Effettuato');
                        } else if (requestStatus === 'warning') {
                            MessageToast.show('Salvataggio parziale dei dati, verificare il log degli esiti');
                        } else {
                            MessageBox.error(`Impossibile procedere con l'operazione richiesta.`);
                        }

                        //Refresh sulla tabella
                        await that.getTimesheetEmployee(currentMonthValue);


                        if (oProgressIndicator && oProgressIndicator.getVisible() === true) {
                            oProgressIndicator.setVisible(false);
                            oProgressIndicator.setDisplayValue(`Totale Record Processati: ${percentageInteger}%`);
                            oProgressIndicator.setPercentValue(percentageInteger);
                        }


                    } else {
                        MessageToast.show('Nessuna modifica da sottomettere');
                    }

                    oBusyDialog.close();
                }.bind(that));
            },

            onDelete: function (oEvent) {
                var that = globalThis.thatHome;
                var deleteStatus = '60';

                var oDialog = new sap.m.Dialog({
                    title: "Conferma cancellazione",
                    type: sap.m.DialogType.Message,
                    content: new sap.m.Text({ text: "Sei sicuro di voler cancellare tutta la riga?\n(Verranno eliminati solo i record non ancora approvati)" }),
                    beginButton: new sap.m.Button({
                        text: "OK",
                        press: function () {
                            oDialog.close();
                            // Azione confermata, esegui la cancellazione
                            let initialArray = oEvent.getSource().getParent();
                            let arrayCells = initialArray.getAggregation("cells");

                            let filteredArray = arrayCells.map(cell => {
                                const oData = cell.getModel().oData;
                                // Restituisci l'oggetto oData solo se non Ã¨ vuoto
                                if (Object.keys(oData).length > 0) {
                                    return oData;
                                }
                            }).filter(Boolean);

                            // Filtra gli oggetti che hanno la proprietÃ  TimeSheetRecord vuota e con stato diverso da sottomesso
                            /*let updatedArray = filteredArray.filter(oData => {
                                return oData.TimeSheetRecord !== undefined && oData.TimeSheetRecord !== '' &&
                                    (oData.YY1_InternalStatus_TIM !== '10' && oData.YY1_InternalStatus_TIM !== '50');
                            });*/

                            // Estraggo solo i record che si trovano a sistema (TimeSheetRecord valorizzato) e con uno stato non ancora approvato o rigettato
                            let updatedArray = filteredArray.filter(oData => {
                                return (oData.TimeSheetRecord && (oData.YY1_InternalStatus_TIM === '10' || oData.YY1_InternalStatus_TIM === '20' || oData.YY1_InternalStatus_TIM === '50'));
                            });

                            if (!updatedArray || (updatedArray && updatedArray.length < 1)) {
                                MessageBox.error(`Non sono presenti record da eliminare.`);
                                return;
                            }

                            // Modifica la proprietÃ  TimeSheetOperation a 'D' per gli oggetti rimanenti
                            updatedArray.forEach(oData => {
                                oData.TimeSheetOperation = 'D';
                            });

                            var oProgressIndicator = that.getView().byId("progressIndicatorID");
                            var percentageInteger = 0;

                            var requestStatus = "";
                            that._pBusyDialog.then(async function (oBusyDialog) {
                                oBusyDialog.setTitle("Cancellazione Dati");
                                oBusyDialog.open();

                                // Invio i dati
                                requestStatus = await that.postTimesheetInfo(updatedArray, "", deleteStatus); //???

                                if (requestStatus == 'success') {
                                    MessageToast.show('Record eliminato');
                                } else if (requestStatus === 'warning') {
                                    MessageToast.show('Salvataggio parziale dei dati, verificare il log degli esiti');
                                } else {
                                    MessageBox.error(`Impossibile procedere con l'operazione richiesta.`);
                                }

                                await that.getTimesheetEmployee(currentMonthValue);

                                oBusyDialog.close();

                                if (oProgressIndicator && oProgressIndicator.getVisible() === true) {
                                    oProgressIndicator.setVisible(false);
                                    oProgressIndicator.setDisplayValue(`Totale Record Processati: ${percentageInteger}%`);
                                    oProgressIndicator.setPercentValue(percentageInteger);
                                }

                            }.bind(that));
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: "Annulla",
                        press: function () {
                            oDialog.close();
                            // Altrimenti, l'utente ha annullato l'operazione
                        }
                    }),
                    afterClose: function () {
                        oDialog.destroy();
                    }
                });

                oDialog.open();
            },

            onResetPopup: function (oEvent) {
                var that = globalThis.thatHome;
                that.getView().byId('popupTimePicker').setValue("00:00");
                that.getView().byId('popupNote').setValue("");
                that.onSavePopup(oEvent);
            },

            saveInputData: async function (TimesheetInfoEmployee, aItems, TimesheetSingleCell, TimesheetSingleCellBackup, buttonCell) {
                var that = globalThis.thatHome;
                //Aggiorno i dati immessi dall'utente
                that.updateTimesheetInfoFromPopup(TimesheetSingleCell, true);

                //Verifico se Ã¨ un nuovo record o se aggiorno uno esistente
                var oMatchingTS = null;
                var TimeSheetOperation = "";

                // Controllo se esiste un record dall'ID Record
                if (TimesheetSingleCell.TimeSheetRecord !== "" && TimesheetSingleCell.TimeSheetRecord !== null && TimesheetSingleCell.TimeSheetRecord !== undefined) {
                    //if (TimesheetSingleCell.TimeSheetRecord.length > 0) {
                    if (TimesheetSingleCell.TimeSheetOperation != "D") {
                        TimeSheetOperation = "U";
                    } else {
                        TimeSheetOperation = "D";
                    }
                    oMatchingTS = TimesheetInfoEmployee.find(timesheet => timesheet.TimeSheetRecord === TimesheetSingleCell.TimeSheetRecord);

                    // Controllo se esiste un record dalla data
                } else {
                    if (TimesheetSingleCell.TimeSheetOperation != "D") {
                        TimeSheetOperation = "C";
                    } else {
                        TimeSheetOperation = "";
                    }
                    oMatchingTS = TimesheetInfoEmployee.find(timesheet => timesheet.TimeSheetDate === TimesheetSingleCell.TimeSheetDate &&
                        timesheet.WBSElement === TimesheetSingleCell.WBSElement &&
                        timesheet.TimeSheetOvertimeCategory === TimesheetSingleCell.TimeSheetOvertimeCategory &&
                        (timesheet.PersonWorkAgreement || '') === (TimesheetSingleCell.PersonWorkAgreement || ''));
                }

                // Calcolo del totale per colonna
                let dataCell = new Date(TimesheetSingleCell.TimeSheetDate);
                let dayCell = dataCell.getUTCDate();
                let recordedHours = TimesheetSingleCell.RecordedHours;
                let insertedWbsCell = TimesheetSingleCell.WBSElement;
                let insertedWorkAgreement = TimesheetSingleCell.PersonWorkAgreement || '';

                var oTableMain = this.getView().byId("idTable");
                var aItems = oTableMain.getItems();
                var columnSums = Array(aItems[0].getCells().length).fill(0);
                var columnSumsRegularHours = Array(aItems[0].getCells().length).fill(0);
                var footerSums = 0;
                var rowSums = 0;

                // Estraggo il Workassignment corretto
                var firstDayOfMonth = new Date(currentMonthValue.getFullYear(), currentMonthValue.getMonth(), 1);
                var lastDayOfMonth = new Date(currentMonthValue.getFullYear(), currentMonthValue.getMonth() + 1, 0);

                var dailyWorkingHours = 8;
                let matchingWA = globalUserInfo.WorkAssignments.find(personWA =>
                    lastDayOfMonth >= (new Date(personWA.WorkAssignmentStartDate)) &&
                    firstDayOfMonth <= (new Date(personWA.WorkAssignmentEndDate)));

                if (matchingWA) {
                    // Calcolo le ore di lavoro giornaliere dell'utente
                    if (matchingWA.WeeklyWorkingHours > 0 && matchingWA.WeeklyWorkingDays > 0) {
                        dailyWorkingHours = matchingWA.WeeklyWorkingHours / matchingWA.WeeklyWorkingDays
                    }
                }

                // Estraggo le info dell'effort sul progetto selezionato
                var StaffingList = this.getModel("StaffingListEmployee").oData;
                var checkEffort = 0;

                for (var i = 0; i < aItems.length; i++) {
                    var aCells = aItems[i].getCells();

                    for (var j = 1; j < aCells.length - 2; j++) {
                        var cell = aCells[j];
                        if (j !== dayCell) {
                            //var cell = aCells[j];
                            // Assuming the "Text" property is in the cell, you can access it like this
                            var textValue = parseFloat(cell.getText());
                            if (!isNaN(textValue)) {

                                // Conteggio il Reject solo se sta cambiando il valore all'interno
                                if (cell.getModel().oData.YY1_InternalStatus_TIM === '50' &&
                                    (cell.getModel().oData.TimeSheetRecord !== TimesheetSingleCell.TimeSheetRecord && cell.getModel().oData.TimeSheetOperation !== 'U')) {
                                    textValue = 0;
                                }

                                columnSums[j] += textValue;
                                rowSums += textValue;

                                if (cell.getModel().oData.TimeSheetOvertimeCategory === overtimeRegularHours) {
                                    columnSumsRegularHours[j] += textValue;
                                }
                            }
                            // Now you can check the value in 'textValue' and perform any necessary operations
                        } else if (j === dayCell) {
                            //var cell = aCells[j];
                            var cellWbs = cell.getModel().oData.WBSElement;
                            var cellWorkAgreement = cell.getModel().oData.PersonWorkAgreement || '';
                            if (cellWbs === insertedWbsCell && cell.getModel().oData.TimeSheetOvertimeCategory === TimesheetSingleCell.TimeSheetOvertimeCategory && cellWorkAgreement === insertedWorkAgreement) {
                                var textValue = parseFloat(recordedHours);
                            } else {
                                var textValue = parseFloat(cell.getText());
                            }

                            if (!isNaN(textValue)) {

                                // Conteggio il Reject solo se sta cambiando il valore all'interno
                                if (cell.getModel().oData.YY1_InternalStatus_TIM === '50' &&
                                    (cell.getModel().oData.TimeSheetRecord !== TimesheetSingleCell.TimeSheetRecord && cell.getModel().oData.TimeSheetOperation !== 'U')) {
                                    textValue = 0;
                                }

                                columnSums[j] += textValue;
                                rowSums += textValue;
                                //controlla se la cella su cui sto inserendo non Ã¨ un overtime se non Ã¨ overtime massimo 8 ore
                                if (cell.getModel().oData.TimeSheetOvertimeCategory === overtimeRegularHours) {
                                    columnSumsRegularHours[j] += textValue;

                                    //se inserisci un orario superiore alle 8 ore restituisce un errore e pulisce la cella
                                    if (columnSumsRegularHours[j] > dailyWorkingHours) {
                                        MessageToast.show(`Limite ore giornaliere raggiunto (${dailyWorkingHours} ore). Fare riferimento al proprio PM.`);
                                        TimesheetSingleCell = TimesheetSingleCellBackup;
                                        return;
                                    }
                                }
                            }
                        }
                    }

                    // Effettuo il check sull'effort nel caso in cui sto caricando su Regolar Hours
                    if (aCells[dayCell] && aCells[dayCell].getModel() && aCells[dayCell].getModel().oData && aCells[dayCell].getModel().oData.TimeSheetOvertimeCategory === overtimeRegularHours) {
                        const sRowWorkAgreement = (aCells[0] && typeof aCells[0].data === "function" && aCells[0].data("WorkAgreement")) ?
                            aCells[0].data("WorkAgreement") : (aCells[dayCell].getModel().oData.PersonWorkAgreement || aCells[dayCell].getModel().oData.PersonWorkAgreementExternalID || "");

                        var matchingProj = StaffingList.find(project =>
                            project.WorkPackageID === aCells[dayCell].getModel().oData.WBSElement &&
                            (project.StaffedEmployee === sRowWorkAgreement || project.StaffedEmployeeExternalID === sRowWorkAgreement)
                        );

                        if (!matchingProj) {
                            matchingProj = StaffingList.find(project => project.WorkPackageID === aCells[dayCell].getModel().oData.WBSElement);
                        }

                        if (matchingProj) {
                            checkEffort = parseFloat(matchingProj.StaffedEffort);

                            if (rowSums > checkEffort) {
                                MessageToast.show("E' stato raggiunto il massimo delle ore assegnate per questo mese.\nNon e' possibile inserire altre ore.");
                                TimesheetSingleCell = TimesheetSingleCellBackup;
                                return;
                            }
                        }
                    }

                    if (rowSums === 0) {
                        oTableMain.removeItem(aItems[i]);
                    }

                    // Se ttutto va bene imposto il totale sulle righe e procedo
                    if (checkEffort > 0) {
                        aCells[aCells.length - 2].setText(`${rowSums}/${checkEffort}`);
                    } else {
                        aCells[aCells.length - 2].setText(rowSums);
                    }

                    rowSums = 0;
                    checkEffort = 0;
                }

                let footerArray = this.getView().byId("idFooter").getItems()[0].getCells();

                for (let i = 1; i < footerArray.length - 1; i++) {
                    const elementFooter = footerArray[i];
                    const sumsCell = columnSums[i]
                    footerSums = footerSums + sumsCell;

                    elementFooter.setProperty("text", sumsCell);
                    elementFooter.setProperty("accesskey", sumsCell);
                }

                // Ottieni il numero di giorni lavorativi
                let totalWorkingHours = 0;
                let totalText = footerSums;
                let workingDays = await this.getWorkingDays(dataCell, true);

                if (workingDays) {

                    var dailyWorkingHours = 8;
                    let matchingWA = globalUserInfo.WorkAssignments.find(personWA =>
                        lastDayOfMonth >= (new Date(personWA.WorkAssignmentStartDate)) &&
                        firstDayOfMonth <= (new Date(personWA.WorkAssignmentEndDate)));
                    if (matchingWA) {
                        // Calcolo le ore di lavoro giornaliere dell'utente
                        if (matchingWA.WeeklyWorkingHours > 0 && matchingWA.WeeklyWorkingDays > 0) {
                            dailyWorkingHours = matchingWA.WeeklyWorkingHours / matchingWA.WeeklyWorkingDays
                        }
                    }

                    totalWorkingHours = workingDays * dailyWorkingHours;
                    totalText = `${footerSums}/${totalWorkingHours}`;
                }

                //faccio la somma di tutte le ore e la inserisco come ultima cella del footer
                //footerArray[footerArray.length - 1].setProperty("text", footerSums);
                //footerArray[footerArray.length - 1].setProperty("accesskey", footerSums);

                footerArray[footerArray.length - 1].setProperty("text", totalText);
                footerArray[footerArray.length - 1].setProperty("accesskey", totalText);

                //chiudo la popup e salvo le informazioni selezionate
                var timeQtyText = "";
                var sNoteText = "";
                var sWorkLocation = "";
                if (TimesheetSingleCell.RecordedQuantity > 0) {
                    timeQtyText = TimesheetSingleCell.RecordedQuantity;
                }

                if (TimesheetSingleCell.TimeSheetNote.trim().length > 0) {
                    //sNoteText = TimesheetSingleCell.TimeSheetNote;
                    sNoteText = `Note:\n${TimesheetSingleCell.TimeSheetNote}`
                }

                if (TimesheetSingleCell.TimeSheetWrkLocCode) {
                    sWorkLocation = `Work Location:\n${this.getWorkLocationName(TimesheetSingleCell.TimeSheetWrkLocCode)}`;
                }

                // Aggiorna i valori del record esistente o Se non esiste aggiungo il nuovo record
                if (oMatchingTS) {
                    if (TimeSheetOperation == "D") {
                        oMatchingTS.TimeSheetOperation = TimeSheetOperation;
                        oMatchingTS.RecordedHours = "";
                        oMatchingTS.RecordedQuantity = "";
                    } else {
                        oMatchingTS.TimeSheetOperation = TimeSheetOperation;
                        oMatchingTS.RecordedHours = TimesheetSingleCell.RecordedHours;
                        oMatchingTS.RecordedQuantity = TimesheetSingleCell.RecordedHours;
                        oMatchingTS.TimeSheetWrkLocCode = TimesheetSingleCell.TimeSheetWrkLocCode;
                        oMatchingTS.TimeSheetNote = TimesheetSingleCell.TimeSheetNote;
                        oMatchingTS.YY1_InternalStatus_TIM = TimesheetSingleCell.YY1_InternalStatus_TIM;
                    }
                } else {
                    if (TimeSheetOperation != "D") {
                        TimesheetSingleCell.TimeSheetOperation = "C";
                        TimesheetInfoEmployee.push(TimesheetSingleCell);
                    }
                }

                buttonCell.setText(timeQtyText);

                let sToolTip = sWorkLocation && sNoteText
                    ? `${sWorkLocation}\n\n${sNoteText}`
                    : sWorkLocation || sNoteText || "";
                if (sToolTip && sToolTip.length > 0 && timeQtyText != 0) {
                    buttonCell.setTooltip(sToolTip);
                } else {
                    buttonCell.setTooltip("");
                }

            },

            checkExistingTimesheet: function (submitData, existingTS, includeMissing = false) {
                // Funzione di confronto per verificare se due record sono "uguali" in base ai campi chiave
                const recordMatches = (r1, r2) => {
                    return (
                        r1.ActivityType === r2.ActivityType &&
                        r1.CompanyCode === r2.CompanyCode &&
                        r1.PersonWorkAgreement === r2.PersonWorkAgreement &&
                        r1.TimeSheetDate === r2.TimeSheetDate &&
                        r1.TimeSheetOvertimeCategory === r2.TimeSheetOvertimeCategory &&
                        //r1.TimeSheetWrkLocCode === r2.TimeSheetWrkLocCode &&
                        r1.Project === r2.Project &&
                        r1.WBSElement === r2.WBSElement &&
                        (r1.PersonWorkAgreement || '') === (r2.PersonWorkAgreement || '')
                    );
                };

                // 1) Aggiorna o sostituisce i record giÃ  esistenti
                let updatedData = submitData.map((oSubmit) => {

                    if (oSubmit.TimeSheetOperation !== "C") {
                        return oSubmit;
                    }

                    const oFoundRecord = existingTS.find((oExisting) =>
                        recordMatches(oExisting, oSubmit)
                    );

                    if (oFoundRecord) {
                        // Clona per evitare side-effect
                        let oUpdatedRecord = JSON.parse(JSON.stringify(oFoundRecord));
                        // Aggiorna i campi soggetti a variazione
                        oUpdatedRecord.RecordedQuantity = oSubmit.RecordedQuantity;
                        oUpdatedRecord.RecordedHours = oSubmit.RecordedHours;
                        oUpdatedRecord.TimeSheetOperation = "U"; // Update
                        return oUpdatedRecord;
                    } else {
                        // Nuovo record da creare (supponendo che in oSubmit sia giÃ  "C")
                        return oSubmit;
                    }
                });

                // 2) Se richiesto, aggiungi i record mancanti provenienti da existingTS che non sono presenti in updatedData
                if (includeMissing) {
                    const missingRecords = existingTS.filter((oExist) =>
                        !updatedData.some((oUpd) => recordMatches(oUpd, oExist))
                    );

                    // Imposta TimeSheetOperation = "" per i record aggiunti
                    missingRecords.forEach((record) => {
                        record.TimeSheetOperation = "";
                    });

                    // Aggiungi i record mancanti a updatedData
                    updatedData.push(...missingRecords);
                }

                return updatedData;

                /*return submitData.map((oSubmit) => {
                    // Trova in existingTS un record corrispondente
                    const oFoundRecord = existingTS.find((oExisting) => {
                        return (
                            ((oSubmit.TimeSheetOperation === "C" || !oSubmit.TimeSheetOperation) &&
                                !oSubmit.TimeSheetRecord) &&

                            oExisting.ActivityType === oSubmit.ActivityType &&
                            oExisting.CompanyCode === oSubmit.CompanyCode &&
                            oExisting.PersonWorkAgreement === oSubmit.PersonWorkAgreement &&
                            oExisting.TimeSheetDate === oSubmit.TimeSheetDate &&
                            oExisting.TimeSheetOvertimeCategory === oSubmit.TimeSheetOvertimeCategory &&
                            oExisting.TimeSheetWrkLocCode === oSubmit.TimeSheetWrkLocCode &&
                            oExisting.Project === oSubmit.Project &&
                            oExisting.WBSElement === oSubmit.WBSElement &&
                            (oExisting.PersonWorkAgreement || '') === (oSubmit.PersonWorkAgreement || '')
                        );
                    });

                    // Se corrispondenza trovata, aggiorna i campi necessari e restituisce il record di existingTS
                    if (oFoundRecord) {
                        // Clona il record per evitare side-effect
                        let oUpdatedRecord = JSON.parse(JSON.stringify(oFoundRecord));

                        // Aggiorna i campi soggetti a variazione
                        oUpdatedRecord.RecordedQuantity = oSubmit.RecordedQuantity;
                        oUpdatedRecord.RecordedHours = oSubmit.RecordedHours;
                        oUpdatedRecord.TimeSheetOperation = "U"; // Update

                        return oUpdatedRecord;
                    }
                    // Altrimenti Ã¨ un nuovo record, ritorna quello di submitData cosÃ¬ com'Ã¨
                    // (ti assicuri che in oSubmit sia giÃ  impostato "C" se Ã¨ un nuovo record)
                    else {
                        return oSubmit;
                    }
                });*/
            }

        });
    });




