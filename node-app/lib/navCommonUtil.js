var uuid = require('node-uuid');
const url = require('url');
var AGE_GROUPS = ['0 - 5 Years', '6 - 7 Years', '8 - 10 Years', '11 - 13 Years', '13 - 15 Years'];
var CATEGORIES = ['Educational', 'Scientific', 'Fun', 'Motor Skills'];
var moment = require('moment');

module.exports = class navCommonUtils {
    constructor() {
        //super();

    }
    generateUuid() {
        return uuid.v4();
    }

    getErrorObject(error, status, code ,exception) {
        if(error.name != exception.name)
        {
            return new exception(error.message, status, code);
        }
        else
        {
            return error;
        }
    }

    getCurrentTime() {
        return moment().valueOf();
    }
    static getCurrentTime_S() {
        return moment().valueOf();
    }
    static getTimeinMillis(dateString) {
        return dateString === "" ? null : moment(dateString).valueOf();
    }
    getDateString(timeInMilis, format) {
	if(timeInMilis) {
		return moment(timeInMilis).format(format ? format : "ddd, MMM Do YYYY");
	} else {
		return "";
	}
    }

    static getDateFormat() {
        return "ddd, MMM Do YYYY";
    }

    getBaseURL(req) {
	var base = new url.Url();
	base.protocol = req.protocol;
	base.host = req.get("host");
	return base;
    }    

    static getAgeGroups() {
        return AGE_GROUPS;        
    }

    static getCategories() {
        return CATEGORIES;
    }
}

