sap.ui.define([
    "./BaseController",
    'sap/m/MessageToast',
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    'sap/ui/core/Fragment',
    "sap/ui/core/syncStyleClass",
    "sap/ui/export/Spreadsheet",
    "sap/ui/model/json/JSONModel",
    "./FinPlanExport"
], function (BaseController, MessageToast, Filter, FilterOperator, Fragment, syncStyleClass, Spreadsheet, JSONModel, FinPlanExport) {
    "use strict";

    return BaseController.extend("schedacommessa.controller.Home", {
        onInit: function () {
            // Aggiungi listener per vari tipi di eventi per resettare il timer
            ["mousemove", "mousedown", "keypress", "scroll", "touchstart"].forEach(event => {
                document.addEventListener(event, this.resetInactivityTimer.bind(this));
            });

            // Inizializzo il timer di inattività
            this.resetInactivityTimer();

            globalThis.thatHome = this;
            this.initPopoverMessage();
            this._MessageManager.removeAllMessages();
            var oSideNavigation = this.byId("sideNavigation");
            if (oSideNavigation) {
                oSideNavigation.setExpanded(false);
            }

            if (!this._pBusyDialog) {
                this.loadBusyDialog();
            }
            var oModelCompany = new sap.ui.model.json.JSONModel([{ CompanyCode: '1000', description: 'Lobra S.r.l.' }, { CompanyCode: '2000', description: 'Lobra Futura S.r.l.' }, { CompanyCode: '3000', description: 'Athenea S.r.l.' }]);

            this.getView().setModel(oModelCompany, "CompanyCode");
            this.setModel(new sap.ui.model.json.JSONModel(), "ProjList");
            let status = this.getView().byId('stateComBox');
            status.setSelectedKeys('P003');
            // Inizializza il modello della view
            var oViewModel = new sap.ui.model.json.JSONModel({
                isExportEnabled: false // Disabilita il pulsante di export per default
            });
            this.getView().setModel(oViewModel, "view");
            this.loadInitialData();
        },

        // === EXPORT ALL COSTS ===

        /** Lazy-load del dialog e cache dei controlli */
        _ensureExportAllCostsDialog: async function () {
            if (this._oExportAllCostsDialog) {
                return this._oExportAllCostsDialog;
            }
            const oView = this.getView();
            this._oExportAllCostsDialog = await Fragment.load({
                id: oView.getId(),
                name: "schedacommessa.view.ExportAllCostsDialog",
                controller: this
            });
            oView.addDependent(this._oExportAllCostsDialog);
            // cache controlli interni
            this._oExportAllCostsStatus = sap.ui.getCore().byId(oView.getId() + "--exportAllCostsStatus");
            this._oExportAllCostsProgress = sap.ui.getCore().byId(oView.getId() + "--exportAllCostsProgress");
            return this._oExportAllCostsDialog;
        },

        _openExportAllCostsDialog: async function () {
            const dlg = await this._ensureExportAllCostsDialog();
            this._exportAllCostsCanceled = false;
            if (this._oExportAllCostsStatus) this._oExportAllCostsStatus.setText("Preparing export...");
            if (this._oExportAllCostsProgress) {
                this._oExportAllCostsProgress.setPercentValue(0);
                this._oExportAllCostsProgress.setDisplayValue("0%");
            }
            dlg.open();
        },

        _updateExportAllCostsDialog: function (index, total, row) {
            if (!this._oExportAllCostsStatus || !this._oExportAllCostsProgress) return;
            const projectId = row.EngagementProject || row.ProjectID || "";
            const projectName = row.ProjectName || "";
            const pct = Math.round(((index + 1) / total) * 100);
            this._oExportAllCostsStatus.setText(`Processing ${index + 1}/${total} • ${projectId} ${projectName ? "– " + projectName : ""}`);
            this._oExportAllCostsProgress.setPercentValue(pct);
            this._oExportAllCostsProgress.setDisplayValue(pct + "%");
        },

        _closeExportAllCostsDialog: function () {
            if (this._oExportAllCostsDialog) {
                this._oExportAllCostsDialog.close();
            }
        },

        onCancelExportAllCosts: function () {
            // handler del bottone Cancel nel fragment
            this._exportAllCostsCanceled = true;
            if (this._oExportAllCostsStatus) this._oExportAllCostsStatus.setText("Cancelling…");
        },

        /** Raccoglie le righe progetto: se selezionate usa quelle, altrimenti quelle visibili */
        _getSelectedProjectRows: function () {
            const oTable = this.byId("idProductsTable");
            const aSelected = oTable.getSelectedItems ? oTable.getSelectedItems() : [];
            if (aSelected && aSelected.length > 0) {
                return aSelected.map(it => it.getBindingContext().getObject());
            }
            const aContexts = oTable.getBinding("items").getContexts();
            return aContexts.map(c => c.getObject());
        },

        /** Costruisce il file Excel dai "flat rows" */
        _buildAllCostsSpreadsheet: async function (aFlatRows) {
            // Stesse colonne dell’export nel FinPlanExport (puoi mantenerle qui o centralizzarle)
            const aColumns = [
                { label: "Project ID", property: "ProjectID", type: "string" },
                { label: "Project Name", property: "ProjectName", type: "string" },
                { label: "Customer", property: "CustomerName", type: "string" },
                { label: "Project Type", property: "ProjectType", type: "string" },
                { label: "Contract Type", property: "ContractType", type: "string" },
                { label: "Sales Office", property: "SalesOfficeName", type: "string" },
                { label: "Project Manager", property: "ProjectManager", type: "string" },
                { label: "Project Stage", property: "ProjectStage", type: "string" },
                { label: "Project Stage Text", property: "ProjectStageText", type: "string" },
                { label: "Company Code", property: "CompanyCode", type: "string" },
                { label: "Company Code Name", property: "CompanyCodeName", type: "string" },
                { label: "Org ID", property: "OrgID", type: "string" },
                { label: "Profit Center", property: "ProfitCenter", type: "string" },
                { label: "Profit Center Name", property: "ProfitCenterName", type: "string" },
                { label: "Start Date", property: "StartDate", type: "string" },
                { label: "End Date", property: "EndDate", type: "string" },

                { label: "Revenue Actual", property: "RevenueActual", type: "string" },
                { label: "Revenue Forecast", property: "RevenueForecast", type: "string" },
                { label: "Revenue Total", property: "RevenueTotal", type: "string" },
                { label: "Revenue Sold", property: "RevenueSold", type: "string" },
                { label: "Revenue Delta", property: "RevenueDelta", type: "string" },
                { label: "Costs Actual", property: "CostsActual", type: "string" },
                { label: "Costs Forecast", property: "CostsForecast", type: "string" },
                { label: "Costs Total", property: "CostsTotal", type: "string" },
                { label: "Costs Sold", property: "CostsSold", type: "string" },
                { label: "Costs Delta", property: "CostsDelta", type: "string" },
                { label: "Margin € Actual", property: "MarginEuroActual", type: "string" },
                { label: "Margin € Forecast", property: "MarginEuroForecast", type: "string" },
                { label: "Margin € Total", property: "MarginEuroTotal", type: "string" },
                { label: "Margin € Sold", property: "MarginEuroSold", type: "string" },
                { label: "Margin € Delta", property: "MarginEuroDelta", type: "string" },
                { label: "Margin % Actual", property: "MarginPercentActual", type: "string" },
                { label: "Margin % Forecast", property: "MarginPercentForecast", type: "string" },
                { label: "Margin % Total", property: "MarginPercentTotal", type: "string" },
                { label: "Margin % Sold", property: "MarginPercentSold", type: "string" },
                { label: "Margin % Delta", property: "MarginPercentDelta", type: "string" },
                { label: "Amount To Be Billed", property: "AmountToBeBilled", type: "string" },
                { label: "Residual Amount", property: "ResidualAmount", type: "string" }
            ];

            const settings = {
                workbook: { columns: aColumns },
                dataSource: aFlatRows,
                fileName: "FinPlan_Projects.xlsx"
            };
            const sheet = new sap.ui.export.Spreadsheet(settings);
            await sheet.build();
            sheet.destroy();
        },

        /** Pulsante della view: progressivo, cancellabile, per-progetto */
        onExportAllCosts: async function () {
            // 0) prendi righe (selezionate o visibili)
            const aRows = this._getSelectedProjectRows();
            if (!aRows || aRows.length === 0) {
                sap.m.MessageToast.show("Nessun progetto da esportare.");
                return;
            }

            this.pauseInactivityTimer();

            // 1) apri dialog/progresso
            await this._openExportAllCostsDialog();

            const sHomeProjectType = this.byId("projectTypeSelect")?.getSelectedKey();
            const collected = [];
            let ok = 0, ko = 0;

            try {
                for (let i = 0; i < aRows.length; i++) {
                    if (this._exportAllCostsCanceled) break;

                    const row = aRows[i];
                    this._updateExportAllCostsDialog(i, aRows.length, row);

                    try {
                        // costruisci i dati (header + metriche) sfruttando l’util che hai già
                        const { flat } = await FinPlanExport.buildProjectSummary(row, { homeProjectType: sHomeProjectType });
                        collected.push(flat);
                        ok++;
                    } catch (e) {
                        // logga e continua
                        ko++;
                        jQuery.sap.log.error("ExportAllCosts - errore su progetto", e);
                    }
                }

                if (!this._exportAllCostsCanceled && collected.length > 0) {
                    // 2) genera Excel una sola volta con tutte le righe raccolte
                    const formattedRows = FinPlanExport.formatRowsForExport(collected);
                    await this._buildAllCostsSpreadsheet(formattedRows);
                    sap.m.MessageToast.show(`Export completato: ${ok} OK, ${ko} KO`);
                } else if (this._exportAllCostsCanceled) {
                    sap.m.MessageToast.show(`Export annullato. Elaborati: ${ok} OK, ${ko} KO`);
                } else {
                    sap.m.MessageToast.show("Nessun dato valido da esportare.");
                }

            } finally {
                // 3) chiudi dialog sempre
                this._closeExportAllCostsDialog();
                this.resumeInactivityTimer();
            }
        },

        loadBusyDialog() {
            var oView = this.getView();
            this._pBusyDialog = Fragment.load({
                name: "schedacommessa.view.BusyDialog",
                controller: this,
            }).then(
                function (oBusyDialog) {
                    oView.addDependent(oBusyDialog);
                    syncStyleClass("sapUiSizeCompact", oView, oBusyDialog);
                    oBusyDialog.open();
                    return oBusyDialog;
                }.bind(this)
            );
        },
        loadInitialData() {
            var oSideNavigation = this.byId("sideNavigation");
            if (oSideNavigation) {
                oSideNavigation.setExpanded(false);
            }
            Promise.all(
                [this.getUserInfo2(),
                this.getProfitCenter(),
                this.getProjectStage(),
                this.getCustomerInfo()]
            ).then(function () { this.setFilter2(); }.bind(this)
            ).catch((error) => {
                this.handleCatch(error, 'setValueFilter'); this._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.close();
                })
            });

        },
        _loadData: async function (sPath, modelName, filterList) {
            var oModel;
            oModel = this.getModel("schedaCommessa");

            var oListBinding = oModel.bindList(sPath);
            var that = this;
            var aAllData = [];
            var iTop = 1000; // Imposta questo in base al limite massimo del server

            // Imposta il filtro se il path è quello di ProfitCenter
            if (sPath === "/ProfitCenter") {
                var oFilter = new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, "EN");
                oListBinding.filter([oFilter]);
            }

            function fetchAllData(iSkip) {
                return new Promise(function (resolve, reject) {
                    oListBinding.requestContexts(iSkip, iTop).then(function (aContexts) {
                        var aPageData = aContexts.map(function (oContext) { return oContext.getObject(); });
                        aAllData = aAllData.concat(aPageData);

                        if (aPageData.length === iTop) {
                            resolve(fetchAllData(iSkip + iTop));
                        } else {
                            resolve(aAllData);
                        }
                    }).catch(reject);
                });
            }

            return fetchAllData(0).then(function (finalData) {
                var oJsonModel = new JSONModel({ items: finalData });
                that.setModel(oJsonModel, modelName);
            });
        },

        onCollapseExpandPress: function () {
            var that = globalThis.thatHome;
            var oSideNavigation = that.byId("sideNavigation");
            if (!oSideNavigation) {
                return;
            }
            var bExpanded = oSideNavigation.getExpanded();
            oSideNavigation.setExpanded(!bExpanded);
            oSideNavigation.setVisible(true);

            // Ottieni il riferimento all'elemento nella vista utilizzando byId
            var oNavList = that.getView().byId("navList");

            // Ora puoi lavorare con oNavList, ad esempio, nascondendolo all'inizio
            if (oNavList) {
                oNavList.setVisible(true);
            }
        },
        setTextonFilterBar() {
            this.byId('container-schedacommessa---Home--filterbar-btnClear').setText("Go");
            this.byId('container-schedacommessa---Home--filterbar-btnRestore').setText("Reset");
            this.byId('container-schedacommessa---Home--filterbar-btnFilters').setText("Adapt Filters");
        },
        onSideNavigationClick: function (oEvent) {
            var that = globalThis.thatHome;
            var oNavList = that.getView().byId("navList");
            if (oNavList) {
                oNavList.setVisible(!oNavList.getVisible());
            } else {
                console.error("NavigationList non trovata o non definita correttamente.");
            }
        },

        onSchedaCommessa: function (oEvent) {
            var that = globalThis.thatHome;
            var flexBoxSc = that.getView().byId("flexBoxSc");
            flexBoxSc.setVisible(true);
        },

        onSchedulazione: function (oEvent) {
            var that = globalThis.thatHome;
            var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
            oRouter.navTo("RouteSchedulazione");
        },



        getProjectList2(filterString) {

            var userLogged = this.getModel("ProjList").getProperty("/userLogged");

            var filterPersonWorkAgreement = "";
            let url = `/odata/v4/staffinglistservices/ProjectSet2`;
            let filter = "";

            if (userLogged.isAdmin === false) {
                var workAssignments = userLogged.WorkAssignments;
                var Person = userLogged.Person;
                var distinctPersonWorkAgreement = [...new Set(workAssignments.map(x => x.PersonWorkAgreement))];
                filterPersonWorkAgreement = " and (ProjectStage eq 'P003' or ProjectStage eq 'P004') and (";
                filterPersonWorkAgreement = filterPersonWorkAgreement.concat(` Person eq '${Person}' or Person_1 eq '${Person}' or Person_2 eq '${Person}' or Person_3 eq '${Person}'  or Person_4 eq '${Person}'  or Person_5 eq '${Person}'`);
                distinctPersonWorkAgreement.forEach((element, index) => {
                    filterPersonWorkAgreement = filterPersonWorkAgreement.concat(` or ProjectManager eq '${element}'`);
                }
                );
                filterPersonWorkAgreement = filterPersonWorkAgreement.concat(")");
            }

            if (filterString) {
                filter += `?$filter=${filterString} and YY1_ProjectCancelled_Cpr eq false ${filterPersonWorkAgreement}`;
            } else {
                filter += `?$filter=YY1_ProjectCancelled_Cpr eq false ${filterPersonWorkAgreement}`;
            }

            url += filter;
            let data = {
                url: url,
                successExit: this.setProjectList.bind(this)
            }
            return this.getoData(data);

        },

        getProfitCenter() {
            let url = "/odata/v4/staffinglistservices/ProfitCenter?$filter=Language eq 'EN'";
            let data = {
                url: url,
                successExit: this.setProfitCenter.bind(this)
            }
            return this.getoData(data);

        },
        setProfitCenter(value) {
            var oJsonModel = new JSONModel({ items: value });
            this.setModel(oJsonModel, 'helpProfitCenter');
        },
        setProjectList(value) {
            //  value.forEach(e=>  e["ProjectFullName"] = e.ProjectName + "\n(" + e.EngagementProject +")")
            this.getModel("ProjList").setProperty("/projRow", value);
        },

        setModel: function (oModel, sName) {
            var that = globalThis.thatHome;
            return that.getView().setModel(oModel, sName);
        },

        getModel: function (sName) {
            var that = globalThis.thatHome;
            return that.getView().getModel(sName);
        },

        onDetailPage: function (oEvent) {
            var oItem = oEvent.getSource();
            var sId = oItem.mAggregations.customData[0].mProperties.value;
            this.navigateToDetail(sId);
        },

        navigateToDetail: function (sId) {
            var that = globalThis.thatHome;
            var globalUserInfo = that.getModel("ProjList").getProperty("/projRow");
            var userLogged = that.getModel("ProjList").getProperty("/userLogged");
            var selectedProject = sId;
            var project = globalUserInfo.find((element) => element.EngagementProject === selectedProject);
            var EngagementProjectUUID = project.EngagementProjectUUID;

            var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
            oRouter.navTo("RouteSchedaCommessa", {
                EngagementProjectUUID: EngagementProjectUUID
            });
        },
        formatProfit(value) {
            var that = globalThis.thatHome;
            var model = that.getView().getModel('helpProfitCenter').oData.items;
            var element = model.find(e => e.ProfitCenter === value);
            return element ? element.ProfitCenterName : value;
        },
        myFormatter: function (sDate) {
            // Cambio formato della data di qualsiasi tipo in DD/MM/YYYY
            if (sDate && sDate !== null && sDate !== undefined && sDate !== '') {
                sDate = new Date(sDate);
                let date = new Date(sDate);

                const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if needed
                const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month (adding 1 since months are 0-based) and pad with leading zero if needed
                const year = date.getFullYear();

                return `${day}/${month}/${year}`;
            } else {
                return sDate;
            }
        },

        onFilterTable: function (oEvent) {
            var that = globalThis.thatHome;
            this.setTextonFilterBar();

            var that = globalThis.thatHome;
            var sQuery = oEvent.getParameter("newValue");
            var oTable = that.getView().byId("idProductsTable");
            var oBinding = oTable.getBinding("items");

            var aFilters = oBinding.aFilters;
            if (sQuery) {
                var resetFilters = aFilters = aFilters.filter(function (obj) {
                    return obj.sPath !== 'ProjectName';
                });
                oBinding.filter(resetFilters);
                var oFilter = new Filter("ProjectName", FilterOperator.Contains, sQuery);
                aFilters.push(oFilter);
                oBinding.filter(aFilters);

                var oTable = this.getView().byId("idProductsTable");
                var oItemsBinding = oTable.getBinding("items");
                var iTotalItems = oItemsBinding.getLength(); // Ottiene il numero totale di elementi nel binding

                // Aggiorna il modello della view con lo stato del pulsante
                this.getView().getModel("view").setProperty("/isExportEnabled", iTotalItems > 0);
            } else {
                var resetFilters = aFilters = aFilters.filter(function (obj) {
                    return obj.sPath !== 'ProjectName';
                });
                oBinding.filter(resetFilters);

                var oTable = this.getView().byId("idProductsTable");
                var oItemsBinding = oTable.getBinding("items");
                var iTotalItems = oItemsBinding.getLength(); // Ottiene il numero totale di elementi nel binding

                // Aggiorna il modello della view con lo stato del pulsante
                this.getView().getModel("view").setProperty("/isExportEnabled", iTotalItems > 0);
            }
        },
        onFilterEngagementProject: function (oEvent) {
            var that = globalThis.thatHome;
            this.setTextonFilterBar();

            var that = globalThis.thatHome;
            var sQuery = oEvent.getParameter("newValue");
            var oTable = that.getView().byId("idProductsTable");
            var oBinding = oTable.getBinding("items");

            var aFilters = oBinding.aFilters;
            if (sQuery) {
                var resetFilters = aFilters = aFilters.filter(function (obj) {
                    return obj.sPath !== 'EngagementProject';
                });
                oBinding.filter(resetFilters);
                var oFilter = new Filter("EngagementProject", FilterOperator.Contains, sQuery);
                aFilters.push(oFilter);
                oBinding.filter(aFilters);

                var oTable = this.getView().byId("idProductsTable");
                var oItemsBinding = oTable.getBinding("items");
                var iTotalItems = oItemsBinding.getLength(); // Ottiene il numero totale di elementi nel binding

                // Aggiorna il modello della view con lo stato del pulsante
                this.getView().getModel("view").setProperty("/isExportEnabled", iTotalItems > 0);
            } else {
                var resetFilters = aFilters = aFilters.filter(function (obj) {
                    return obj.sPath !== 'EngagementProject';
                });
                oBinding.filter(resetFilters);

                var oTable = this.getView().byId("idProductsTable");
                var oItemsBinding = oTable.getBinding("items");
                var iTotalItems = oItemsBinding.getLength(); // Ottiene il numero totale di elementi nel binding

                // Aggiorna il modello della view con lo stato del pulsante
                this.getView().getModel("view").setProperty("/isExportEnabled", iTotalItems > 0);
            }
        },
        onFilterSalesOffice: function (oEvent) {
            var that = globalThis.thatHome;
            this.setTextonFilterBar();

            var that = globalThis.thatHome;
            var sQuery = oEvent.getParameter("newValue");
            var oTable = that.getView().byId("idProductsTable");
            var oBinding = oTable.getBinding("items");

            var aFilters = oBinding.aFilters;
            if (sQuery) {
                var resetFilters = aFilters = aFilters.filter(function (obj) {
                    return obj.sPath !== 'SalesOfficeName';
                });
                oBinding.filter(resetFilters);
                var oFilter = new Filter("SalesOfficeName", FilterOperator.Contains, sQuery);
                aFilters.push(oFilter);
                oBinding.filter(aFilters);

                var oTable = this.getView().byId("idProductsTable");
                var oItemsBinding = oTable.getBinding("items");
                var iTotalItems = oItemsBinding.getLength(); // Ottiene il numero totale di elementi nel binding

                // Aggiorna il modello della view con lo stato del pulsante
                this.getView().getModel("view").setProperty("/isExportEnabled", iTotalItems > 0);
            } else {
                var resetFilters = aFilters = aFilters.filter(function (obj) {
                    return obj.sPath !== 'SalesOfficeName';
                });
                oBinding.filter(resetFilters);

                var oTable = this.getView().byId("idProductsTable");
                var oItemsBinding = oTable.getBinding("items");
                var iTotalItems = oItemsBinding.getLength(); // Ottiene il numero totale di elementi nel binding

                // Aggiorna il modello della view con lo stato del pulsante
                this.getView().getModel("view").setProperty("/isExportEnabled", iTotalItems > 0);
            }
        },


        onFilterProjectManager: function (oEvent) {
            var that = globalThis.thatHome;
            this.setTextonFilterBar();

            var that = globalThis.thatHome;
            var sQuery = oEvent.getParameter("newValue");
            var oTable = that.getView().byId("idProductsTable");
            var oBinding = oTable.getBinding("items");

            var aFilters = oBinding.aFilters;
            if (sQuery) {
                var resetFilters = aFilters = aFilters.filter(function (obj) {
                    return obj.sPath !== 'PMPersonFullName';
                });
                oBinding.filter(resetFilters);
                var oFilter = new Filter("PMPersonFullName", FilterOperator.Contains, sQuery);
                aFilters.push(oFilter);
                oBinding.filter(aFilters);

                var oTable = this.getView().byId("idProductsTable");
                var oItemsBinding = oTable.getBinding("items");
                var iTotalItems = oItemsBinding.getLength(); // Ottiene il numero totale di elementi nel binding

                // Aggiorna il modello della view con lo stato del pulsante
                this.getView().getModel("view").setProperty("/isExportEnabled", iTotalItems > 0);
            } else {
                var resetFilters = aFilters = aFilters.filter(function (obj) {
                    return obj.sPath !== 'PMPersonFullName';
                });
                oBinding.filter(resetFilters);

                var oTable = this.getView().byId("idProductsTable");
                var oItemsBinding = oTable.getBinding("items");
                var iTotalItems = oItemsBinding.getLength(); // Ottiene il numero totale di elementi nel binding

                // Aggiorna il modello della view con lo stato del pulsante
                this.getView().getModel("view").setProperty("/isExportEnabled", iTotalItems > 0);
            }
        },
        getFilterdString() {
            this.setTextonFilterBar();
            var oFilterBar = this.getView().byId("filterbar");

            function formatDateToISOString(date) {
                if (!date) return null;
                // Creazione di un oggetto date
                const dateObject = new Date(date);
                // Conversione in stringa ISO senza considerare l'orario e aggiungendo 'T00:00:00Z' manualmente
                const formattedDate = dateObject.toISOString().split('T')[0] + 'T00:00:00Z';
                return formattedDate;
            }

            // Supponendo che 'dateValue' sia il valore ottenuto dal DatePicker
            var aTableFilters = oFilterBar.getFilterGroupItems().reduce(function (aResult, oFilterGroupItem) {
                // salta la voce "Project Type"
                if (oFilterGroupItem.getName() === "ProjectType") {
                    return aResult;
                }

                var oControl = oFilterGroupItem.getControl();
                var aFilters = [];

                // Gestione MultiComboBox
                if (oControl.getSelectedKeys) {
                    var aSelectedKeys = oControl.getSelectedKeys();
                    aFilters = aSelectedKeys.map(function (sSelectedKey) {
                        return new sap.ui.model.Filter({
                            path: oFilterGroupItem.getName(),
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sSelectedKey
                        });
                    });
                } else if (oControl.getTokens) {
                    let oTokens = oControl.getTokens();
                    oTokens.forEach((item) => {
                        aFilters.push(new sap.ui.model.Filter({
                            path: oControl.getName(),
                            operator: 'EQ',
                            value1: item.getProperty('key')
                        }));
                    })
                }
                // Gestione DatePicker
                else if (oControl.getDateValue) {
                    var dateValue = oControl.getDateValue();
                    if (dateValue) {
                        var formattedDate = formatDateToISOString(dateValue);
                        var filterOperator = oFilterGroupItem.getName() === "StartDate" ? sap.ui.model.FilterOperator.GE : sap.ui.model.FilterOperator.LE;
                        aFilters.push(new sap.ui.model.Filter({
                            path: oFilterGroupItem.getName(),
                            operator: filterOperator,
                            value1: formattedDate
                        }));
                    }
                } else if (oControl.getId() === 'container-schedacommessa---Home--ProjectCategory') {
                    if (oControl.getSelected()) {
                        aFilters.push(new sap.ui.model.Filter({
                            path: oFilterGroupItem.getName(),
                            operator: 'eq',
                            value1: 'I'
                        }
                        ));
                    } else {
                        aFilters.push(new sap.ui.model.Filter({
                            path: oFilterGroupItem.getName(),
                            operator: 'eq',
                            value1: 'C'
                        }
                        ));
                    }
                }
                if (aFilters.length > 0) {
                    aResult.push(new sap.ui.model.Filter({
                        filters: aFilters,
                        and: false
                    }));
                }

                return aResult;
            }, []);


            var filterString = "";
            if (aTableFilters.length > 0) {
                aTableFilters.forEach((filter, index, array) => {
                    var groupFilter = filter.aFilters;
                    filterString += "(";
                    if (groupFilter.length > 0) {
                        groupFilter.forEach((singleFilter, index, array) => {
                            // Determina l'operatore in base al nome del filtro
                            let operator = singleFilter.sPath === "StartDate" ? "ge" :
                                singleFilter.sPath === "EndDate" ? "le" : "eq";

                            // Formatta il valore della data nel formato desiderato se necessario
                            let filterValue = singleFilter.oValue1 instanceof Date ?
                                singleFilter.oValue1.toISOString() : // Converti in stringa ISO se è una data
                                singleFilter.oValue1;

                            // Assicurati che il valore della data sia in formato "YYYY-MM-DDT00:00:00Z"
                            if (singleFilter.oValue1 instanceof Date) {
                                filterValue = `${filterValue.substring(0, 10)}T00:00:00Z`;
                            }

                            filterString += index === array.length - 1 ?
                                `${singleFilter.sPath} ${operator} '${filterValue}'` :
                                `${singleFilter.sPath} ${operator} '${filterValue}' or `;
                        });
                        filterString += index === array.length - 1 ? ")" : ") and ";
                    }
                });
            }
            return filterString;
        },
        onSearch: async function () {
            this._pBusyDialog.then(async function (oBusyDialog) {
                oBusyDialog.open();
            })

            this.setTextonFilterBar();
            var oFilterBar = this.getView().byId("filterbar");

            function formatDateToISOString(date) {
                if (!date) return null;
                // Creazione di un oggetto date
                const dateObject = new Date(date);
                // Conversione in stringa ISO senza considerare l'orario e aggiungendo 'T00:00:00Z' manualmente
                const formattedDate = dateObject.toISOString().split('T')[0] + 'T00:00:00Z';
                return formattedDate;
            }

            // Supponendo che 'dateValue' sia il valore ottenuto dal DatePicker
            var aTableFilters = oFilterBar.getFilterGroupItems().reduce(function (aResult, oFilterGroupItem) {
                // salta la voce "Project Type"
                if (oFilterGroupItem.getName() === "ProjectType") {
                    return aResult;
                }

                var oControl = oFilterGroupItem.getControl();
                var aFilters = [];

                // Gestione MultiComboBox
                if (oControl.getSelectedKeys) {
                    var aSelectedKeys = oControl.getSelectedKeys();
                    aFilters = aSelectedKeys.map(function (sSelectedKey) {
                        return new sap.ui.model.Filter({
                            path: oFilterGroupItem.getName(),
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sSelectedKey
                        });
                    });
                } else if (oControl.getTokens) {
                    let oTokens = oControl.getTokens();
                    oTokens.forEach((item) => {
                        aFilters.push(new sap.ui.model.Filter({
                            path: oControl.getName(),
                            operator: 'EQ',
                            value1: item.getProperty('key')
                        }));
                    })
                }
                // Gestione DatePicker
                else if (oControl.getDateValue) {
                    var dateValue = oControl.getDateValue();
                    if (dateValue) {
                        var formattedDate = formatDateToISOString(dateValue);
                        var filterOperator = oFilterGroupItem.getName() === "StartDate" ? sap.ui.model.FilterOperator.GE : sap.ui.model.FilterOperator.LE;
                        aFilters.push(new sap.ui.model.Filter({
                            path: oFilterGroupItem.getName(),
                            operator: filterOperator,
                            value1: formattedDate
                        }));
                    }
                } else if (oControl.getId() === 'container-schedacommessa---Home--ProjectCategory') {
                    if (oControl.getSelected()) {
                        aFilters.push(new sap.ui.model.Filter({
                            path: oFilterGroupItem.getName(),
                            operator: 'eq',
                            value1: 'I'
                        }
                        ));
                    } else {
                        aFilters.push(new sap.ui.model.Filter({
                            path: oFilterGroupItem.getName(),
                            operator: 'eq',
                            value1: 'C'
                        }
                        ));
                    }
                }
                if (aFilters.length > 0) {
                    aResult.push(new sap.ui.model.Filter({
                        filters: aFilters,
                        and: false
                    }));
                }

                return aResult;
            }, []);


            var filterString = "";
            if (aTableFilters.length > 0) {
                aTableFilters.forEach((filter, index, array) => {
                    var groupFilter = filter.aFilters;
                    filterString += "(";
                    if (groupFilter.length > 0) {
                        groupFilter.forEach((singleFilter, index, array) => {
                            // Determina l'operatore in base al nome del filtro
                            let operator = singleFilter.sPath === "StartDate" ? "ge" :
                                singleFilter.sPath === "EndDate" ? "le" : "eq";

                            // Formatta il valore della data nel formato desiderato se necessario
                            let filterValue = singleFilter.oValue1 instanceof Date ?
                                singleFilter.oValue1.toISOString() : // Converti in stringa ISO se è una data
                                singleFilter.oValue1;

                            // Assicurati che il valore della data sia in formato "YYYY-MM-DDT00:00:00Z"
                            if (singleFilter.oValue1 instanceof Date) {
                                filterValue = `${filterValue.substring(0, 10)}T00:00:00Z`;
                            }

                            filterString += index === array.length - 1 ?
                                `${singleFilter.sPath} ${operator} '${filterValue}'` :
                                `${singleFilter.sPath} ${operator} '${filterValue}' or `;
                        });
                        filterString += index === array.length - 1 ? ")" : ") and ";
                    }
                });
            }

            /*//Aggiunta filtro su Project Type
            var oPrjTypeKeys = globalThis.thatHome.byId("prjTypeComBox").getSelectedKeys();

            if (oPrjTypeKeys && oPrjTypeKeys.length > 0) {
                var WPList = globalThis.thatHome.getModel("workPackageTypeAll").getData();
                var filteredWP = !oPrjTypeKeys || oPrjTypeKeys.length === 0
                    ? WPList
                    : WPList.filter(item =>
                        oPrjTypeKeys.includes(String(item.BillingPlanUsageCategory))
                    );

                var filterProj = globalThis.thatHome.createFilter(filteredWP, 'CustomerProject', 'EngagementProject', 'OR');
                //var filtertest = globalThis.thatHome.createSapFilterFromArray(filteredWP, 'CustomerProject', 'EngagementProject');
                //var filterProj2 = globalThis.thatHome.createSapFilterFromArray(filteredWP, 'CustomerProject', 'EngagementProject', 'OR');
                if (filterProj) {
                    filterString += ` and ( ${filterProj} )`;
                }
            }*/

            Promise.all(
                [
                    this.getProjectList2(filterString),
                ]
            ).then(function () {
                this._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.close();
                    var oTable = this.getView().byId("idProductsTable");
                    var oItemsBinding = oTable.getBinding("items");
                    var iTotalItems = oItemsBinding.getLength(); // Ottiene il numero totale di elementi nel binding

                    // Aggiorna il modello della view con lo stato del pulsante
                    this.getView().getModel("view").setProperty("/isExportEnabled", iTotalItems > 0);
                }.bind(this));
            }.bind(this)).catch((error) => {
                this.handleCatch(error, 'setValueFilter');
                this._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.close();
                })
            });

        },

        getUserInfo2() {
            let url = `/odata/v4/userinfo/UserInfo`;

            let data = {
                url: url,
                successExit: this.setUserProperty.bind(this)
            }
            return this.getoData(data);
        },

        getProjectStage: async function () {
            let url = `/odata/v4/staffinglistservices/ProjectStage`;
            let data = {
                url: url,
                successExit: this.setProjectStage.bind(this)
            }

            return this.getoData(data);
        },


        getCustomerInfo: async function () {

            let url = `/odata/v4/staffinglistservices/CustomerInfo`;
            let data = {
                url: url,
                modelName: 'Customer'
            }
            return this.getoData(data);
        },
        setProjectStage(value) {

            //  var distinctStatus = [...new Set(value.map(x => JSON.stringify([x.EngagementProjectStageText, x.EngagementProjectStage])))].map(x => JSON.parse(x));
            var oModel = this.getModel("ProjList");
            oModel.setProperty("/DistStatus", value);
        },

        setUserProperty(value) {
            let user = {
                ...value[0],
                isAdmin: false
            };

            if (user.BusinessRoles.find(role => role.BusinessRole === 'LB_BR_MANAGER_HRINFO')) {
                user.isAdmin = true;
            }

            var oModel = this.getModel("ProjList");
            oModel.setProperty("/userLogged", user);
            oModel.setProperty("/filterCount", 0);

        },
        formatCompanyCode(codice) {
            try {
                var that = globalThis.thatHome;
                var company = that.getView().getModel('CompanyCode').oData;
                var valore = company.find(v => v.CompanyCode === codice);
                return valore ? valore.description : codice;

            } catch (error) {
                return '';
            }
        },
        setFilter2() {
            var oModel = this.getModel("ProjList");
            var userLogged = oModel.getProperty('/userLogged')
            if (userLogged.isAdmin) {
                this._pBusyDialog.then(async function (oBusyDialog) {
                    oBusyDialog.close();
                })
            } else {
                Promise.all(
                    [
                        this.getProjectList2(this.getFilterdString())
                    ]
                ).then(function (globalUserInfo) {

                    var prjects = globalUserInfo[0].value;

                    var status = oModel.getProperty("/DistStatus");
                    var customer = this.getModel("Customer").oData;
                    var ProfitCenter = this.getModel("helpProfitCenter").oData.items;

                    var distinctProfit = this.removeDuplicateBy(prjects,
                        x => x.ProfitCenter,
                        function myFunction(x) {
                            return x.ProfitCenter
                        });
                    var distinctStatus = this.removeDuplicateBy(prjects,
                        x => x.ProjectStage,
                        function myFunction(x) {
                            return x.ProjectStage;
                        });
                    var distinctCustomer = this.removeDuplicateBy(prjects,
                        x => x.Customer,
                        function myFunction(x) {
                            return x.Customer;
                        });

                    status = status.filter(e => e.EngagementProjectStage === 'P003' || e.EngagementProjectStage === 'P004')

                    customer = customer.filter(e => distinctCustomer.find(d => d === e.Customer))
                    ProfitCenter = ProfitCenter.filter(e => distinctProfit.find(d => d === e.ProfitCenter))


                    var oJsonModel = new JSONModel({ items: ProfitCenter });
                    this.setModel(oJsonModel, 'helpProfitCenter');

                    oModel.setProperty("/DistStatus", status);

                    var oJsonModel_C = new JSONModel(customer);
                    this.setModel(oJsonModel_C, 'Customer');

                    this._pBusyDialog.then(async function (oBusyDialog) {
                        oBusyDialog.close();
                    });
                }.bind(this)
                ).catch((error) => {
                    this.handleCatch(error, 'setValueFilter');
                    this._pBusyDialog.then(async function (oBusyDialog) {
                        oBusyDialog.close();
                    })
                });
            }

        },

        onExportToExcel: function () {
            var oTable = this.getView().byId("idProductsTable");
            var aItems = oTable.getItems();

            // Controlla se la tabella ha elementi
            if (aItems.length === 0) {
                // Mostra un messaggio all'utente che non ci sono dati da esportare
                sap.m.MessageToast.show("Non ci sono dati da esportare.");
                return; // Interrompe l'esecuzione ulteriore della funzione
            }

            var oItemsBinding = oTable.getBinding("items");
            var oData = oItemsBinding.getContexts().map(context => context.getObject());

            var oFormattedData = oData.map(function (oEntry) {
                return {
                    ...oEntry,
                    OrgIDFormatted: this.formatCompanyCode(oEntry.OrgID),
                    StartDateFormatted: this.myFormatter(oEntry.StartDate),
                    EndDateFormatted: this.myFormatter(oEntry.EndDate),
                    StageFormatted: this.formatStage(oEntry.ProjectStage),
                    ProfitCenterName: this.formatProfit(oEntry.ProfitCenter)
                };
            }.bind(this));

            var aColumns = [
                { label: 'Company', property: 'OrgIDFormatted', type: 'string' },
                { label: 'Project ID', property: 'EngagementProject', type: 'string' },
                { label: 'Project Name', property: 'ProjectName', type: 'string' },
                { label: 'Customer Name', property: 'CustomerName', type: 'string' },
                { label: 'Sales Office', property: 'SalesOfficeName', type: 'string' },
                { label: 'Project Manager', property: 'PMPersonFullName', type: 'string' },
                { label: 'Profit Center', property: 'ProfitCenterName', type: 'string' },
                { label: 'Start Validity', property: 'StartDateFormatted', type: 'string' },
                { label: 'End Validity', property: 'EndDateFormatted', type: 'string' },
                { label: 'Status', property: 'StageFormatted', type: 'string' }
            ];

            var currentDateTime = new Date();
            var formattedDate = currentDateTime.toLocaleDateString('it-IT', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }).replace(/\//g, '_');
            var formattedTime = currentDateTime.toLocaleTimeString('it-IT', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).replace(/:/g, '_');
            var fileName = `ProjectList_${formattedDate}_${formattedTime}.xlsx`;

            var oSettings = {
                workbook: { columns: aColumns },
                dataSource: oFormattedData,
                fileName: fileName
            };

            var oSheet = new sap.ui.export.Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },
        formatStage(value) {
            var that = globalThis.thatHome;
            var oModel = that.getModel("ProjList");
            var projectStage = oModel.getProperty("/DistStatus");
            var element = projectStage.find(e => e.EngagementProjectStage === value)
            return element ? element.EngagementProjectStageText : value
        },
        myFormatter: function (sDate) {
            if (sDate) {
                var oDate = new Date(sDate);
                return oDate.getDate().toString().padStart(2, '0') + '/' +
                    (oDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
                    oDate.getFullYear();
            } else {
                return '';
            }
        },
        handleValueHelp: function (oEvent) {
            var sInputValue = oEvent.getSource().getValue(),
                oView = this.getView(),
                oMultiInput = this.byId("customerInput");

            oMultiInput.removeAllTokens();

            // create value help dialog
            if (!this._pCustomerHelpDialog) {
                this._pCustomerHelpDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.CustomerDetail",
                    controller: this
                }).then(function (oValueHelpDialog) {
                    oView.addDependent(oValueHelpDialog);
                    return oValueHelpDialog;
                });
            }

            this._pCustomerHelpDialog.then(function (oValueHelpDialog) {
                // create a filter for the binding
                oValueHelpDialog.getBinding("items").filter([new Filter(
                    "CustomerName",
                    FilterOperator.Contains,
                    sInputValue
                )]);
                // open value help dialog filtered by the input value
                oValueHelpDialog.open(sInputValue);
            });
        },
        closeDialogCustomer: function () {
            let oMultiInput = this.byId("customerInput");

            oMultiInput.removeAllTokens();
            this._pCustomerHelpDialog.then(function (oDialog) {

                //  oDialog.close();
                oDialog.destroy();
            })
            this._pCustomerHelpDialog = null;
        },

        _handleOrderDetailSearch: function (evt) {

            var sValue = evt.getParameter("value");
            var oFilter = new Filter(
                "CustomerName",
                FilterOperator.Contains,
                sValue
            );
            evt.getSource().getBinding("items").filter([oFilter]);
        },        // Metodo per gestire la selezione delle righe
        onSelectionRow: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("listItems"),
                oMultiInput = this.byId("customerInput");

            aSelectedItems.forEach(aSelectedItem => {
                let title = aSelectedItem.getCells()[0].getTitle(),
                    text = aSelectedItem.getCells()[1].getText();


                if (aSelectedItem.getProperty('selected')) {
                    oMultiInput.addToken(new sap.m.Token({
                        text: text,
                        key: title,
                    }));
                } else {
                    var oTokens = oMultiInput.getTokens();
                    for (let i = 0; i < oTokens.length; i++) {
                        if (oTokens[i].getKey() === title) {
                            oMultiInput.removeToken(i)
                            break;
                        }
                    }
                }
            })
        },
        handleValueHelpProfitCenter: function (oEvent) {
            var sInputValue = oEvent.getSource().getValue(),
                oView = this.getView(),
                oMultiInput = this.byId("ProfitCenter");

            oMultiInput.removeAllTokens();

            // create value help dialog
            if (!this._pProfitCenterFHelpDialog) {
                this._pProfitCenterHelpDialog = Fragment.load({
                    id: oView.getId(),
                    name: "schedacommessa.view.ProfitCenterDetail",
                    controller: this
                }).then(function (oValueHelpDialog) {
                    oView.addDependent(oValueHelpDialog);
                    return oValueHelpDialog;
                });
            }

            this._pProfitCenterHelpDialog.then(function (oValueHelpDialog) {
                // create a filter for the binding
                oValueHelpDialog.getBinding("items").filter([new Filter(
                    "ProfitCenterName",
                    FilterOperator.Contains,
                    sInputValue
                )]);
                // open value help dialog filtered by the input value
                oValueHelpDialog.open(sInputValue);
            });
        },
        closeDialogProfitCenter: function () {
            let oMultiInput = this.byId("ProfitCenter");

            oMultiInput.removeAllTokens();
            this._pProfitCenterHelpDialog.then(function (oDialog) {

                //  oDialog.close();
                oDialog.destroy();
            })
            this._pProfitCenterHelpDialog = null;
        },

        _handleProfitCenterDetailSearch: function (evt) {

            var sValue = evt.getParameter("value");
            var oFilter = new Filter(
                "ProfitCenterName",
                FilterOperator.Contains,
                sValue
            );
            evt.getSource().getBinding("items").filter([oFilter]);
        },        // Metodo per gestire la selezione delle righe
        onSelectionRowProfitCenter: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("listItems"),
                oMultiInput = this.byId("ProfitCenter");

            aSelectedItems.forEach(aSelectedItem => {
                let title = aSelectedItem.getCells()[0].getTitle(),
                    text = aSelectedItem.getCells()[1].getText();


                if (aSelectedItem.getProperty('selected')) {
                    oMultiInput.addToken(new sap.m.Token({
                        text: text,
                        key: title,
                    }));
                } else {
                    var oTokens = oMultiInput.getTokens();
                    for (let i = 0; i < oTokens.length; i++) {
                        if (oTokens[i].getKey() === title) {
                            oMultiInput.removeToken(i)
                            break;
                        }
                    }
                }
            })
        },

        /*getWorkPackageTypeByProject: async function (projectID) {
            var WorkPackage = projectID + '.1.1';
            var WPList = this.getModel("workPackageTypeAll").getData();
            var selectedWP = WPList.find(row => row.CustomerProject === projectID);
            var result = this.formattBillingPlanUsageCategory(selectedWP.BillingPlanUsageCategory);
            return result;
        },

        onFilterBillingType: function () {
            this.setTextonFilterBar();

            var oTable = this.byId("idProductsTable");
            var oBinding = oTable.getBinding("items");

            // prendo le chiavi selezionate dal MultiComboBox
            var keys = this.byId("prjTypeComBox").getSelectedKeys() || [];

            // tolgo l’eventuale vecchio filtro di billing type
            var existing = Array.isArray(oBinding.aFilters) ? oBinding.aFilters : [];
            var otherFilters = existing.filter(function (f) { return !f._isBillingType; });

            // nessuna selezione => rimuovo il filtro di billing type e applico solo gli altri
            if (keys.length === 0) {
                oBinding.filter(otherFilters);
                this.getView().getModel("view").setProperty("/isExportEnabled", oBinding.getLength() > 0);
                return;
            }

            // calcolo i progetti ammessi dai WP
            var WPListModel = this.getModel("workPackageTypeAll");
            var WPList = WPListModel ? WPListModel.getData() : [];

            var allowedProjectsArr = Array.from(
                new Set(
                    WPList
                        .filter(function (x) { return keys.includes(String(x.BillingPlanUsageCategory)); })
                        .map(function (x) { return x.CustomerProject; })
                        .filter(Boolean)
                )
            );

            // se non c'è nessun progetto per quei tipi -> filtro che non matcha nulla
            var billingTypeFilter;
            if (allowedProjectsArr.length === 0) {
                billingTypeFilter = new sap.ui.model.Filter("EngagementProject", sap.ui.model.FilterOperator.EQ, "__NO_MATCH__");
            } else {
                // OR di tanti EQ su EngagementProject
                var eqFilters = allowedProjectsArr.map(function (p) {
                    return new sap.ui.model.Filter("EngagementProject", sap.ui.model.FilterOperator.EQ, p);
                });
                billingTypeFilter = new sap.ui.model.Filter({
                    filters: eqFilters,
                    and: false
                });
            }
            // flag per riconoscerlo e poterlo sostituire al prossimo giro
            billingTypeFilter._isBillingType = true;

            // applico: (altri filtri) AND (billingTypeFilter)
            var finalFilters = otherFilters.concat(billingTypeFilter);
            oBinding.filter(finalFilters);

            // aggiorno lo stato Export
            this.getView().getModel("view").setProperty("/isExportEnabled", oBinding.getLength() > 0);
        }*/

        getWorkPackageTypeByProject: function (projectID) {
            // 1) prendo tutti i WP del progetto
            const wpModel = this.getModel("workPackageTypeAll");
            const allWP = wpModel ? (wpModel.getData() || []) : [];
            let candidates = allWP.filter(wp => wp.CustomerProject === projectID);

            if (candidates.length === 0) return ""; // nessun WP per quel progetto

            // 2) se c'è un record in ProjectTypeSettings, escludo i WP con stato diverso
            const ptsModel = this.getModel("ProjectTypeSettings") || this.getModel("ProjectType");
            const ptsData = ptsModel ? (ptsModel.getData() || []) : [];
            const setting = ptsData.find(r => r.ProjectID === projectID);

            if (setting && setting.ProjectType != null) {
                const expected = String(setting.ProjectType).replace(/^0+/, ""); // "01" -> "1"
                candidates = candidates.filter(wp => String(wp.BillingPlanUsageCategory) === expected);

                // se dopo l’esclusione non rimane niente, non restituisco nulla
                if (candidates.length === 0) return "";
            }

            // 3) prendo il primo WP rimasto (semplice)
            const firstWp = candidates[0];
            const code = firstWp ? firstWp.BillingPlanUsageCategory : "";

            // 4) restituisco la descrizione usando la tua funzione
            return this.formattBillingPlanUsageCategory(code);
        },

        onFilterBillingType: function () {
            this.setTextonFilterBar();

            var oTable = this.byId("idProductsTable");
            var oBinding = oTable.getBinding("items");

            // chiavi selezionate nel MultiComboBox (tipi progetto = BillingPlanUsageCategory)
            var keys = this.byId("prjTypeComBox").getSelectedKeys() || [];

            // rimuovo l’eventuale vecchio filtro di billing type
            var existing = Array.isArray(oBinding.aFilters) ? oBinding.aFilters : [];
            var otherFilters = existing.filter(function (f) { return !f._isBillingType; });

            // nessuna selezione => tolgo solo il filtro di billing type e applico gli altri
            if (keys.length === 0) {
                oBinding.filter(otherFilters);
                this.getView().getModel("view").setProperty("/isExportEnabled", oBinding.getLength() > 0);
                return;
            }

            // --- dati di supporto ---
            var WPListModel = this.getModel("workPackageTypeAll");
            var WPList = WPListModel ? (WPListModel.getData() || []) : [];

            // Model dei Project Type Settings (nome a scelta: "ProjectType" oppure "ProjectTypeSettings")
            var prjTypeModel = this.getModel("ProjectType") || this.getModel("ProjectTypeSettings");
            var prjTypeData = prjTypeModel ? (prjTypeModel.getData() || []) : [];

            // mappa { ProjectID -> ProjectType normalizzato (senza zeri a sx) }
            var stripZeros = function (v) { return (v == null ? "" : String(v).replace(/^0+/, "")); };
            var prjTypeMap = {};
            prjTypeData.forEach(function (r) {
                if (r && r.ProjectID) prjTypeMap[r.ProjectID] = stripZeros(r.ProjectType);
            });

            // --- filtro WP: deve essere del tipo selezionato
            // e, se il progetto è presente nei settings, il tipo WP deve combaciare con il tipo progetto
            var allowedProjectsArr = Array.from(new Set(
                WPList
                    .filter(function (wp) {
                        var wpType = String(wp.BillingPlanUsageCategory || "");
                        // 1) coerente con i tipi selezionati
                        if (!keys.includes(wpType)) return false;

                        var prjId = wp.CustomerProject;
                        var expectedType = prjTypeMap[prjId]; // undefined se non presente nei settings

                        // 2) se c'è un'impostazione per il progetto, deve combaciare
                        if (expectedType !== undefined && expectedType !== null && expectedType !== "") {
                            return wpType === String(expectedType);
                        }
                        // 3) se NON c'è impostazione, non escludiamo
                        return true;
                    })
                    .map(function (wp) { return wp.CustomerProject; })
                    .filter(Boolean)
            ));

            // costruisco il filtro su EngagementProject
            var billingTypeFilter;
            if (allowedProjectsArr.length === 0) {
                // filtro che non matcha nulla
                billingTypeFilter = new sap.ui.model.Filter("EngagementProject", sap.ui.model.FilterOperator.EQ, "__NO_MATCH__");
            } else {
                var eqFilters = allowedProjectsArr.map(function (p) {
                    return new sap.ui.model.Filter("EngagementProject", sap.ui.model.FilterOperator.EQ, p);
                });
                billingTypeFilter = new sap.ui.model.Filter({ filters: eqFilters, and: false });
            }

            // flag per riconoscerlo al prossimo giro
            billingTypeFilter._isBillingType = true;

            // (altri filtri) AND (billingTypeFilter)
            var finalFilters = otherFilters.concat(billingTypeFilter);
            oBinding.filter(finalFilters);

            // stato export
            this.getView().getModel("view").setProperty("/isExportEnabled", oBinding.getLength() > 0);
        },

        onExportFinPlan: async function () {
            // prendi le righe progetto (selezionate, filtrate o tutte)
            const aRows = this._getSelectedProjectRows(); // implementazione tua
            // se vuoi forzare un project type proveniente dalla home:
            const sHomeProjectType = this.byId("projectTypeSelect")?.getSelectedKey(); // esempio

            await FinPlanExport.exportToExcel(aRows, {
                fileName: "FinPlan_Projects.xlsx",
                homeProjectType: sHomeProjectType
            });
        }

    });

});
