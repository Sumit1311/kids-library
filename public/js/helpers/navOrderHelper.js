registerOrderHandlers();

function registerOrderHandlers () {
    $("#_nav_order_div > form").submit(function(event){new navOrderHelper().orderHandler(event, this)});
}

function navOrderHelper(){
}

navOrderHelper.prototype.orderHandler=function(event, that){
    var form = $(that);
    event.preventDefault();

    $("#_nav_order_button").prop('disabled', true);;
    var self = this;
    this.placeOrder(form)
        .catch(function(error){
            if(typeof error == "string") {
                self.showError(error);
            } else {
                self.showError(error.subMessage);
            }
            $("#_nav_order_button").prop('disabled', false);;
        });
}

navOrderHelper.prototype.placeOrder= function(form){
    var body = form.serialize();
    //console.log(body);
    return navRequestHandler().doRequest(form.attr('action'), 'POST', body);
}

navOrderHelper.prototype.showError = function(message) {
    $("#_nav_order_error .alert").html(message);
    $("#_nav_order_error").removeClass("hidden");
}
