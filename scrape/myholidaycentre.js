var cheerio = require('cheerio');
var request = require('request');
var fs = require('fs');
var util = require('util');
var sql = require('mssql');
//var connection = require(__dirname + '/config/db');
var pool = require('../config/db');
const requ = new sql.Request(pool);

//destination

//  deal(description,destination,stars,nights,link,title,purchase_by,agency)
// *** String ,String,int,int,String,String,String('mm/dd/yyyy')

// deal_departure(deal_id,departure,price)
// ** Int,String,Float

// deal_dates(deal_id,deal_departure_id,date_from,date_to)
// ** Int,Int,String('mm/dd/yyyy'),String('mm/dd/yyyy')

exports.holidaycenterScrape = function(req, res) {
    getAllUrl()
}

function getAllUrl() {
    pool.close();
    pool.connect(function(err, connection) {
        if (!err) {
            var url = "https://www.myholidaycentre.com.au/";
            request(url, function(error, response, html) {
                if (!error) {
                    var $ = cheerio.load(html);
                    var allLink = [];
                    $('.item-tile a').each(function(i, e) {
                        var data = $(this);
                        if (data.attr("href").includes('http:')) {
                            allLink.push(data.attr("href"));

                        } else {
                            //console.log('Other Urls', data.attr("href"));
                        }
                    })
                    for (var x = 0; x < allLink.length; x++) {
                        setTimeout(function(i) {
                            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                            console.log('@@   ' + allLink[i] + '  @@');
                            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                            getChildData(allLink[i]);
                        }, x * 40000, x);
                    }
                } else {
                    console.log('Error', err);
                }
            });
        } else {
            console.log('Connection Error');
        }
    })
}

/////////////////////////////////
// pool.close();
// pool.connect(function(err, connection) {
//     if (!err) {
//         var child = "http://myfiji.com";
//         getChildData(child);
//     } else {

//     }
// });


function getChildData(child) {
    console.log('Starting  ', child);
    request(child, function(error, response, html) {
        if (!error) {
            var $ = cheerio.load(html);
            $('.et_pb_text_inner .element-item .item-tile a').each(function(i, e) {
                var data = $(this);
                var allData = {};
                var link = data.attr("href");
                allData["link"] = link;
                allData["destination"] = getDestination(link);
                allData["title"] = data.find('.details h3').text();
                var NightPrice = data.find('.details .small').text().split('$');
                allData["nights"] = parseInt(NightPrice[0]);
                allData["price"] = parseInt(NightPrice[1]);
                setTimeout(function(z) {
                    requ.query("select * from deal where link='" + link + "'", function(err, cityD) {
                        if (!err) {
                            if (cityD.recordset.length > 0) {
                                console.log('Already there', link)
                            } else {
                                ScrapeFromInner(allData, link, z);
                            }
                        } else {
                            console.log('Error for select data from deal table', err);
                        }
                    });
                }, i * 4000, i);
            })
        } else {
            console.log('Error', err);
        }
    });
}

function getDestination(link) {
    link = link.split("my").pop();
    link = link.substr(0, link.indexOf('.'));
    return link;
}

function ScrapeFromInner(allData, z) {
    console.log('@@ Link', allData.link);
    request(allData.link, function(error, response, html) {
        if (!error) {
            var $ = cheerio.load(html);
            var departure = [];
            $('#departure-iata option').each(function(i, e) {
                var depa = $(this);
                var price = depa.attr('data-price');
                var value = depa.text();
                departure.push({
                    price: price,
                    value: value
                })
            })
            allData["departure"] = departure;
            var purchase_by = $('.book-date .date').text();
            purchase_by = purchase_by.split('Book by')[1].trim();
            allData["purchase_by"] = dateFormate(purchase_by)
            var des = [];
            // Get Before hr tag
            $('.one_half hr').prevAll().each(function(i, e) {
                var data = $(this);
                //console.log('data', data.text());
                if (data[0].name == "p") {
                    des.push("<p>" + data.text() + "</p>");
                } else {
                    des.push("<ul><li>" + data.text().replace(/(\r\n|\n|\r)/gm, "") + "</li></ul>"); //
                }
            })
            des = des.reverse();
            allData["description"] = des.toString().replace(/(\,)/gm, "");
            //Get After hr tag 
            /**
             * Need to get date_from and date_to from here
             */
            var dates = [];
            $('.one_half hr').nextAll().eq(0).each(function(i, e) {
                var data = $(this);
                var date = data.text().split("Valid");
                for (var i = 0; i < date.length; i++) {
                    if (date[i]) {
                        var d = date[i].split(":").pop().replace("–", "").replace("–", "-");
                        d = d.split('-')
                        console.log('d', d);
                        var firstDigit = d[0].match(/\d/);
                        var indexed = d[0].indexOf(firstDigit);
                        if (d[1]) {
                            var dd = getDate(d[0].slice(indexed) + '-' + d[1].split(';')[0]);
                        } else {
                            var dd = getDate(d[0].trim());
                        }
                        //console.log('date[i]', d[1].split(';'));
                        dd = dd.split('-')
                        var date_to = dd[0];
                        var date_from = dd[1];
                        dates.push({
                            date_to: date_to,
                            date_from: date_from
                        })
                    }
                }
            })
            allData["dates"] = dates;
            //console.log('allData', allData);
            saveData(allData);
        } else {
            console.log('Error for scrape from inner', error);
        }
    });
}

function saveData(allData) {


    var dealD = [];
    var description = allData.description;
    var destination = allData.destination;
    // var stars = allData.stars;
    var nights = allData.nights;
    var link = allData.link;
    var title = allData.title;
    var purchase_by = allData.purchase_by;
    console.log('purchase_by', purchase_by);
    requ.query("insert into deal(description,destination,nights,link,title,purchase_by,agency) values( '" +
        description + "',  '" +
        destination + "', " +
        nights + ",  '" +
        link + "',  '" +
        title + "', '" +
        purchase_by + "','my holiday centre')",
        function(err, dealAdded) {
            if (!err) {
                requ.query("SELECT max(id) id from deal", function(err, lastIns) {
                    if (!err) {
                        var d_id = lastIns.recordset[0].id;
                        dealD["d_id"] = d_id;
                        for (var k = 0; k < allData.departure.length; k++) {
                            var deal_id = dealD.d_id;
                            var departure = allData.departure[k].value || "";
                            var price = parseFloat(allData.departure[k].price) || 1300.0;
                            requ.query("insert into deal_departure(deal_id,departure,price) values(  '" +
                                deal_id + "', '" +
                                departure + "',  '" +
                                price + "')",
                                function(err, addDepart) {
                                    if (!err) {
                                        requ.query("SELECT @@IDENTITY AS 'Identity'", function(err, lastInsDepart) {
                                            if (!err) {
                                                var deal_departure_id = lastInsDepart.recordset[0].Identity;
                                                console.log('dates', allData.dates);
                                                var date_from = allData.dates[0].date_from;
                                                var date_to = allData.dates[0].date_to;
                                                requ.query("insert into deal_dates(deal_id,deal_departure_id,date_from,date_to) values(  '" +
                                                    deal_id + "',  " +
                                                    deal_departure_id + ", '" +
                                                    date_from + "',  '" +
                                                    date_to + "')",
                                                    function(err, dateIns) {
                                                        if (!err) {
                                                            console.log('INserted');
                                                        } else {
                                                            console.log('Error for inserting into deal date', err);
                                                        }
                                                    })
                                            } else {
                                                console.log('Error for identity', err);
                                            }
                                        });
                                    } else {
                                        console.log('Error for adding into deal_departure', err);
                                    }
                                });
                        }
                    } else {
                        console.log('error for select into deal id', err);
                        return;
                    }
                });
            } else {
                console.log('Error for insert into deal', err);
                return;
            }
        });
}

function getDate(d) {
    console.log('d', d);
    var date = d.trim().split('-') || d.split(' ');
    console.log('date', date);
    var year = new Date(date[1]).getFullYear();
    var mm = date[0].trim().split(" ");
    if (!mm[1]) {
        var toDate = new Date(date[1]);
        var from = toDate.setMonth(toDate.getMonth() - mm);
        var from = new Date(from).setMonth(mm - 1)
    } else {
        var from = date[0] + ' ' + year;
    }
    var to = date[1]
    return dateFormate(from) + '-' + dateFormate(to)
}


function dateFormate(d) {
    var date = new Date(d);
    var mm = parseInt(date.getMonth()) + 1;
    return date.getFullYear() + '/' + mm + '/' + date.getDate();
}

/**
 * DD/MM/YYYY
 *  TO
 * MM/DD/YYYY
 */
function purchageDate(date) {
    if (date) {
        var newD = date.split("/");
        var retuData = newD[1] + '/' + newD[0] + '/' + newD[2];
        return retuData;
    } else {
        return false;
    }
}