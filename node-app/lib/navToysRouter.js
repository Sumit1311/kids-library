var navBaseRouter = require(process.cwd() + '/lib/navBaseRouter.js'),
    navLogUtil = require(process.cwd() + "/lib/navLogUtil.js"),
    navAccount = require(process.cwd() + "/lib/navAccount.js"),
    navOrders = require(process.cwd() + "/lib/navOrders.js"),
    navPayments = require(process.cwd() + "/lib/navPayments.js"),
    navResponseUtil = require(process.cwd() + "/lib/navResponseUtil.js"),
    navCommonUtil = require(process.cwd() + "/lib/navCommonUtil.js"),
    navValidationException = require(process.cwd() + "/lib/exceptions/navValidationException.js"),
    navLogicalException = require("node-exceptions").LogicalException,
    navNoStockException = require(process.cwd() + "/lib/exceptions/navNoStockException.js"),
    navPendingReturnException = require(process.cwd() + "/lib/exceptions/navPendingReturnException.js"),
    repeatHelper = require('handlebars-helper-repeat'),
    helpers = require('handlebars-helpers')(),
    navUserDAO = require(process.cwd() + "/lib/dao/user/userDAO.js"),
    navRentalsDAO = require(process.cwd() + "/lib/dao/rentals/navRentalsDAO.js"),
    navToysHandler = require(process.cwd() + "/lib/navToysHandler.js"),
    Q = require('q'),
    querystring = require("querystring");

module.exports = class navToysRouter extends navBaseRouter {
    constructor() {
        super();
    }

    setup() {
        var self = this;
        this.router.use(this.ensureAuthenticated.bind(this), this.ensureVerified.bind(this), this.isSessionAvailable.bind(this));
        this.router.get('/detail', function(req,res,next){self.getToysDetails(req,res,next);});
        this.router.get('/search', function(req,res,next){self.getSearchPage(req,res,next)});
        this.router.get('/order', function(req,res,next){self.getOrder(req,res,next)});
        this.router.get('/orderPlaced', function(req,res,next){self.getOrderPlaced(req,res,next)});
        this.router.post('/placeOrder',(req, res, next) => {self.placeOrder(req,res,next)});
        this.router.post('/cancelOrder',(req, res, next) => {self.cancelOrder(req,res,next)});
        this.router.post('/confirmTransaction', this.ensureVerified.bind(this), 
                        this.ensureAuthenticated.bind(this), 
                        this.isSessionAvailable.bind(this), 
                        this.processTransactions.bind(this));
        return this;
    }
    getToysDetails(req, res) {
        var id = req.query.id;
        var deferred = Q.defer();
        
        req.assert("id"," Bad Request").notEmpty();

        var validationErrors = req.validationErrors();
        //console.log(validationErrors);
        if(validationErrors)
        {
            deferred.reject(new navValidationException(validationErrors));
        }
        new navToysHandler().getToyDetail(id)
            .done((result) => {
                res.render('detail', {
                    user: req.user,
                    isLoggedIn : req.user ? true : false,
                    layout : 'nav_bar_layout',
                    toyDetail : result.toyDetail,
                    imageCount : result.imageCount,
                    helpers : {
                        repeat : repeatHelper,
                        helper : helpers
                    }
                });
            },(error) => {
                var respUtil =  new navResponseUtil();
                var response = respUtil.generateErrorResponse(error);
                respUtil.renderErrorPage(req, res, {
                    errorResponse : response,
                    user : req.user,
                    isLoggedIn : false,
                    layout : 'nav_bar_layout',

                });

            })
    } 
    getOrder(req, res) {
        var id = req.query.id, user = req.user;
        var self = this;
        var deferred = Q.defer();
        deferred.promise
            .done((result) => {
                res.render('order', {
                    user : user,
                    layout : 'nav_bar_layout',
                    isLoggedIn : req.user ? true : false,
                    toyDetail : result
                });
            },(error) => {
                var respUtil =  new navResponseUtil();
                var response = respUtil.generateErrorResponse(error);
                respUtil.renderErrorPage(req, res, {
                    errorResponse : response,
                    user : req.user,
                    isLoggedIn : false,
                    layout : 'nav_bar_layout',

                });

            })
        req.assert("id"," Bad Request").notEmpty();


        var validationErrors = req.validationErrors();
        //console.log(validationErrors);
        if(validationErrors)
        {
            return deferred.reject(new navValidationException(validationErrors));
        }
        new navAccount().getCommunicationDetails(user._id)
            .then(function(n_User){
                user.address = n_User.address;
                user.city = n_User.city;
                user.state = n_User.state;
                user.pinCode = n_User.pin_code;
                return new navToysHandler().getToyDetail(id)
                //return (new navToysDAO()).getToyDetailById(id)
            })
        .then(function(result){
            //console.log(toyDetail, id);

            if(!result.toyDetail) {
                return Q.reject(new navLogicalException());
            }
            return result.toyDetail;
        })
        .done((toyDetail) => {
            deferred.resolve(toyDetail);
        },(err) => {
            navLogUtil.instance().log.call(self,self.getOrder.name, 'Error occured ' + err, "error");
            deferred.reject(err);
        });
    }
    placeOrder(req, res){
        var self = this;
        var id = req.query.id;
        var deferred = Q.defer();
        var respUtil =  new navResponseUtil();
        var transactions, transfers, orderId;
        
        deferred.promise
            .done(() => {
                if(transfers.length == 0 && transactions.length == 0) {
                    res.render('orderPlaced',{
                        user : req.user,
                        isLoggedIn : req.user ? true : false,
                        layout : 'nav_bar_layout'
                    });

                } else {
                    res.render('orderConfirmation', {
                        orderId : orderId,
                        transfers : transfers,
                        transactions : transactions,
                        helpers : {
                            repeat : repeatHelper,
                            helper : helpers
                        }
                    });
                }
                //respUtil.redirect(req, res, '/toys/orderPlaced');
            },(error) => {
                var response = respUtil.generateErrorResponse(error);
                respUtil.renderErrorPage(req, res, {
                    errorResponse : response,
                    user : req.user,
                    isLoggedIn : false,
                    layout : 'nav_bar_layout',

                });

            })
        req.assert("id"," Bad Request").notEmpty();
        req.assert("shippingAddress","Bad Request").notEmpty();


        var validationErrors = req.validationErrors();
        //console.log(validationErrors);
        var user = req.user;
        if(validationErrors)
        {
            return deferred.reject(new navValidationException(validationErrors));
        }
        var rDAO = new navRentalsDAO();
        var userDetails, toyDetails;         //debugger;
        rDAO.getClient()
            .then(function(client){
                rDAO.providedClient = client;
                return rDAO.startTx();
            })
        .then(() => {
            var uDAO = new navUserDAO(rDAO.providedClient);
            return uDAO.getUserDetails(user._id);
        })
        .then((_userDetails) => {
            userDetails = _userDetails[0];
            /*if(userDetails.deposit === null) {
                return Q.reject(new navNoSubScriptionException());
            }
            if(userDetails.membership_expiry !== null && userDetails.membership_expiry < new navCommonUtil().getCurrentTime()) {
                return Q.reject(new navMembershipExpirationException());
            }*/
            //TODO : check what to do with the order where lease date is ended but toy is not delivered
            return new navOrders(rDAO.providedClient).getActiveOrders(user._id);
        })
        .then((_orders) => {
            if(_orders.length !== 0 && _orders[0].lease_end_date >= navCommonUtil.getCurrentTime_S()) {
                return Q.reject(new navPendingReturnException());
            }
            return new navToysHandler(rDAO.providedClient).getToyDetail(id);
        })
        .then((result) => {
            if(result) {
                toyDetails = result.toyDetail;
                /*if(toyDetails.price > userDetails.balance) {
                    return Q.reject(new navNoBalanceException());
                }*/
                if(toyDetails.stock === 0) {
                    return Q.reject(new navNoStockException());
                }
                return new navAccount().getTransactions(userDetails, toyDetails);
            } else {
                navLogUtil.instance().log.call(self, self.placeOrder.name, "No toys found for " + id , "warn");
                return Q.resolve();
            }
        })
        .then((result) => {
            if(result) {
                transactions = result.transactions;
                transfers = result.transfers;
                user.shippingAddress = req.body.shippingAddress;
                return new navOrders(rDAO.providedClient).placeAnOrder(user, toyDetails, transfers);
            } else {
                return Q.resolve();
            }
        
        })
        .then(function(result){
            if(result.rowCount > 0) {
                orderId = result.orderId;
            }
            /*if(toyDetails && transactions.length === 0) {
                return new navAccount(rDAO.providedClient).rentToy(user._id, userDetails, toyDetails)
            } else {
                return Q.resolve(result);
            }*/
            return Q.resolve();
        })
        .then(function() {
            /*if(toyDetails) {
                navLogUtil.instance().log.call(self, self.placeOrder.name, "Updating stock of toy : "+id , "info");
                return new navToysHandler(rDAO.providedClient).getOnRent(toyDetails._id);
            } else {
                return Q.resolve();
            }*/
            return Q.resolve();
        })
        .then(function(){
            return rDAO.commitTx();
        })
        .catch(function(error){

            return rDAO.rollBackTx()
            .then(function () {
                navLogUtil.instance().log.call(self, self.placeOrder.name, "Error occured Details : " + error, "error");
                return Q.reject(error);
            })
            .catch(function (err) {
                navLogUtil.instance().log.call(self, self.placeOrder.name, "Error occured while rollbacking : " + err, "error");
                //log error
                return Q.reject(err);
            })
        })
        .finally(function () {
            if (rDAO.providedClient) {
                rDAO.providedClient.release();
                rDAO.providedClient = undefined;
            }
        })
        .done(function(){
            deferred.resolve(); 
        }, (error) => {
            deferred.reject(error);
        })
    }
    getOrderPlaced() {
    }    
    getSearchPage(req, res) {
        var self = this;
        var q = req.query.q ? req.query.q : "", offset = req.query.offset ? req.query.offset : 0, sortBy = req.query.sortBy ? req.query.sortBy: 0; 
        var sortType = req.query.sortType ? req.query.sortType : 0, activeCategories = [], activeAgeGroups = [], activeSkills = [], activeBrands = []; 
        if(!offset ) {
            offset = 0;
        }
        
           var index;
        for(var key in req.query) {
            if(req.query.hasOwnProperty(key)) {
                if(key === "category") {
                    for(index = 0; index < req.query[key].length; index++) {
                        activeCategories.push(parseInt(req.query[key][index]));
                    }
                }
                if(req.query.hasOwnProperty(key) && (key == "ageGroup")) {
                    for(index = 0; index < req.query[key].length; index++) {
                        activeAgeGroups.push(parseInt(req.query[key][index]));
                    }
                }
                if(req.query.hasOwnProperty(key) && (key === "skill")) {
                    for(index = 0; index < req.query[key].length; index++) {
                        activeSkills.push(parseInt(req.query[key][index]));
                    }
                }
                if(req.query.hasOwnProperty(key) && (key === "brand")) {
                    for(index = 0; index < req.query[key].length; index++) {
                        activeBrands.push(parseInt(req.query[key][index]));
                    }
                }
            }
        }
        req.assert("q"," Bad Request").isByteLength({min :0, max :128});
        //req.assert("shippingAddress","Bad Request").notEmpty();
        var deferred = Q.defer();
        var respUtil =  new navResponseUtil(), categories, ageGroups, skills, brands, perPageToys = 4;
        var sortColumns = ["name", "price", "age_group"];
        var sortLabels = ["Name", "Price", "Age Group"];
        var sortTypes = ["ASC", "DESC"];
        deferred.promise
            .done((result) => {
                //console.log(brands);
                navLogUtil.instance().log.call(self, self.getSearchPage.name, "Categories : " + req.query.category, "info");
                delete req.query.offset;
                //console.log(querystring.stringify(req.query));
                res.render('searchToys', {
                    user : req.user,
                    isLoggedIn : req.user ? true : false,
                    layout : 'nav_bar_layout',
                    query : q,
                    queryParameters : querystring.stringify(req.query),
                    toysData : {
                        toysList : result.toys,
                        filters : {
                            categories : categories,
                            ageGroups : ageGroups,
                            skills : skills,
                            brands : brands,
                            activeCategories : activeCategories,
                            activeAge : activeAgeGroups, 
                            activeSkills : activeSkills,
                            activeBrands : activeBrands
                        },
                        sorters : {
                            sortLabels : sortLabels,
                            sortTypes : sortTypes,
                            sortBy : sortBy,
                            sortType : sortType
                        },
                        noOfPages : result.noOfPages,
                        perPageLimit : result.perPageToys,
                        currentPage : offset ? (Math.floor(offset/result.perPageToys) + 1) : 1
                    },
                    helpers : {
                        repeat : repeatHelper
                    }

                })    
            },(error) => {
                var response = respUtil.generateErrorResponse(error);
                respUtil.renderErrorPage(req, res, {
                    errorResponse : response,
                    user : req.user,
                    isLoggedIn : false,
                    layout : 'nav_bar_layout',

                });
            })


        var validationErrors = req.validationErrors();
        //console.log(validationErrors);
        if(validationErrors)
        {
            return deferred.reject(new navValidationException(validationErrors));
        }
        ageGroups = navCommonUtil.getAgeGroups();
        categories = navCommonUtil.getCategories();
        skills = navCommonUtil.getSkills();
        brands = navCommonUtil.getBrands();
        //new navToysDAO().getAllToys(null, null, activeAgeGroups, activeCategories, q.split(" "), sortColumns[sortBy], sortTypes[sortType], activeSkills, activeBrands)
        new navToysHandler().getToysList(null, offset, perPageToys, {
            categories : activeCategories,
            ageGroups : activeAgeGroups,
            skills : activeSkills,
            brands : activeBrands,
            keywords : q.split(" ")
        }, [{
            column : sortColumns[sortBy],
            type :sortTypes[sortType]
        }])
            .done((results) => {
                deferred.resolve(results);
            }, (error) => {
                navLogUtil.instance().log.call(self, self.getSearchPage.name, "Error occured Details : " + error, "error");
                deferred.reject(error);
            });


    }

    cancelOrder(req, res) {
        var self = this;
         var orderId = req.query.orderId;
        var deferred = Q.defer();
        var respUtil =  new navResponseUtil();
        deferred.promise
            .done(() => {
                respUtil.redirect(req, res, '/user/orderDetails');
            },(error) => {
                var response = respUtil.generateErrorResponse(error);
                respUtil.renderErrorPage(req, res, {
                    errorResponse : response,
                    user : req.user,
                    isLoggedIn : false,
                    layout : 'nav_bar_layout',

                });
                /*response = new navResponseUtil().generateErrorResponse(error);
                  res.status(response.status).render("errorDocument",{
                  errorResponse : response,
                  user : req.user,
                  isLoggedIn : false,
                  layout : 'nav_bar_layout',
                  });*/

            })
        req.assert("orderId"," Bad Request").notEmpty();
        req.assert("orderId","Bad Request").isUUID();


        var validationErrors = req.validationErrors();
        //console.log(validationErrors);
        if(validationErrors)
        {
            return deferred.reject(new navValidationException(validationErrors));
        }
        navLogUtil.instance().log.call(self, self.getSearchPage.name, "Canceling order :  " + orderId, "info");
         new navOrders().updateOrder(orderId, null, null, {
            orderStatus : navRentalsDAO.getStatus().CANCELLED
         })
             .done(() => {
                deferred.resolve();
             },(error) => {
                navLogUtil.instance().log.call(self, self.cancelOrder.name, "Error occured Details : " + error.stack, "error");
                deferred.reject(error);
             })
    }
    processTransactions(req, res) {
        var self = this;
        var orderId = req.query.ref, paymentMethod = req.body.paymentMethod;
        var deferred = Q.defer();
        var respUtil =  new navResponseUtil();
        deferred.promise
            .done((result) => {
                if(result) {
                    res.render(result.pageToRender, {data : result.context, redirectURL : result.redirectURL});
                } else {
                    respUtil.redirect(req, res, '/user/orderDetails');
                }
            },(error) => {
                var response = respUtil.generateErrorResponse(error);
                respUtil.renderErrorPage(req, res, {
                    errorResponse : response,
                    user : req.user,
                    isLoggedIn : false,
                    layout : 'nav_bar_layout',

                });
                /*response = new navResponseUtil().generateErrorResponse(error);
                  res.status(response.status).render("errorDocument",{
                  errorResponse : response,
                  user : req.user,
                  isLoggedIn : false,
                  layout : 'nav_bar_layout',
                  });*/

            })
        req.assert("ref"," Bad Request").notEmpty();
        req.assert("ref","Bad Request").isUUID();
        //req.assert("paymentMethod"," Bad Request").notEmpty();
        
        var client, user = req.user, orderDetail, toyDetail, transactions, transfers, r;
        var uDAO = new navUserDAO()
        uDAO.getClient()
            .then((_client) => {
                client = _client;
                uDAO.providedClient = client;
                return uDAO.startTx();
            })
            .then(() => {
                return new navOrders(client).getActiveOrders(user._id);
            })
            .then((orderDetails) => {
                if(orderDetails.length == 0) {
                    return Q.reject(new Error("No active order exists"))
                }
                orderDetail = orderDetails[0];
                return new navToysHandler(client).getToyDetail(orderDetail.toys_id);
            })
            .then((result) => {
                toyDetail = result.toyDetail;
                return new navAccount(client).getTransactions(user, toyDetail);
            })
            .then((result) => {
                transactions = result.transactions;
                transfers = result.transfers;
                if(transfers.length === 0 && transactions.length === 0) {
                    return new navOrders(client).completeOrder(orderId, "success");
                }
                if(transfers.length !== 0 ) {
                    return new navPayments(client).doPayments(orderId, user._id, transfers, "transfer", null, true, transactions.length > 0);
                } else {
                    return Q.resolve();
                }
            })
            .then(() => {
                if(transactions.length !== 0) {
                    return new navPayments(client).doPayments(orderId, user._id, transactions, paymentMethod, navCommonUtil.getBaseURL_S(req), true)
                } else {
                    return Q.resolve();
                }

            })
            .then((_result) => {
                r = _result;
                return uDAO.commitTx();
            }) 
            .then(() => {
                return Q.resolve(r);
            })
            .catch((error) => {
                
                return uDAO.rollBackTx()
                    .then(function () {
                        navLogUtil.instance().log.call(self, self.processTransactions.name, "Error occured Details : " + error.stack, "error");
                        return Q.reject(error);
                    })
                    .catch(function (err) {
                        navLogUtil.instance().log.call(self, self.processTransactions.name, "Error occured while rollbacking : " + err.stack, "error");
                        //log error
                        return Q.reject(err);
                    })
            })
            .finally(function () {
                if (uDAO.providedClient) {
                    uDAO.providedClient.release();
                    uDAO.providedClient = undefined;
                }
            })
            .done((r) => {
                deferred.resolve(r);
            },(error) => {
                deferred.reject(error);
            })

    }
}
