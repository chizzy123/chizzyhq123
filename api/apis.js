var sql = require('mssql');
var pool = require('../config/db');
const requ = new sql.Request(pool);

// Get all deal data for display in home page
exports.getallDeal = function(req, res) {
    pool.close();
    var dataForSearch = req.body;
    console.log('Data for search', dataForSearch)
    var date = dataForSearch.date;
    var date_from = date.split("to")[0];
    var date_to = date.split("to")[1];
    var departure = dataForSearch.departure || "Sydney";
    var destination = dataForSearch.destination || "Brisbane, Australia";

    // select d.*,de.* from deal_dates d left join deal de on d.deal_id=de.id where d.date_from >='2018-03-09' and date_to <= '2018-10-01' and de.destination='detinatio name';
    // select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id left join deal_departure depa on date.deal_departure_id=depa.id where date.date_from >= '2017-01-01' and date.date_to <= '2018-01-19' and depa.departure='Sydney' and de.destination ='Brisbane, Australia'
    pool.connect(function(err, connection) {
        if (!err) {
            //       requ.query("select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id left join deal_departure depa on date.deal_departure_id=depa.id where date.date_from >= '" + date_from + "' and date.date_to <= '" + date_to + "' and depa.departure='" + departure + "' and de.destination ='" + destination + "'", function(err, data) {

            console.log('date_from', date_from, ' date_to', date_to);
            requ.query("select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id left join deal_departure depa on date.deal_departure_id=depa.id where date.date_from >= '" + date_from + "' and date.date_to <= '" + date_to + "' and depa.departure='" + departure + "' and de.destination ='" + destination + "'", function(err, data) {
                if (!err) {
                    res.send({ code: 200, status: 1, message: 'Deal data get successfully', data: data.recordset });
                    return;
                } else {
                    console.log('Error for selecting data from data base', err);
                    res.send({ code: 422, status: 0, message: 'Error for selecting data from data base' });
                    return;
                }
            })
        } else {
            console.log('Error for connection', err);
            res.send({ code: 500, status: 0, message: 'Connection Error' });
            return;
        }
    })
}

exports.getallHolidayDeal = function(req, res) {
    pool.close();
    var dataForSearch = req.body;
    console.log('Data for search', dataForSearch)
    var date = dataForSearch.date;
    var departure = dataForSearch.departure || req.params.departure;
    var destination = dataForSearch.destination;
    console.log('departure', departure);
    if (departure && destination && date) {
        var date_from = date.split("to")[0];
        var date_to = date.split("to")[1];
        var SearchQue = "select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id left join deal_departure depa on date.deal_departure_id=depa.id where date.date_from >= '" + date_from + "' and date.date_to <= '" + date_to + "' and depa.departure='" + departure + "' and de.destination ='" + destination + "' order by de.destination";
    } else if (departure && destination) {
        var SearchQue = "select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id left join deal_departure depa on date.deal_departure_id=depa.id where depa.departure='" + departure + "' and de.destination ='" + destination + "' order by de.destination";
    } else if (departure && date) {
        var date_from = date.split("to")[0];
        var date_to = date.split("to")[1];
        var SearchQue = "select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id left join deal_departure depa on date.deal_departure_id=depa.id where date.date_from >= '" + date_from + "' and date.date_to <= '" + date_to + "' and depa.departure='" + departure + "' order by de.destination";
    } else if (departure) {
        var SearchQue = "select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id left join deal_departure depa on date.deal_departure_id=depa.id where depa.departure='" + departure + "' order by de.destination";
    } else if (destination) {
        var SearchQue = "select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id left join deal_departure depa on date.deal_departure_id=depa.id where depa.destination='" + destination + "' order by de.destination";
    } else if (date) {
        var date_from = date.split("to")[0];
        var date_to = date.split("to")[1];
        var SearchQue = "select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id left join deal_departure depa on date.deal_departure_id=depa.id where date.date_from >= '" + date_from + "' and date.date_to <= '" + date_to + "' order by de.destination";
    }

    console.log('SearchQue', SearchQue);
    pool.connect(function(err, connection) {
        if (!err) {
            if (dataForSearch.withCity) {
                console.log('With city');
                requ.query("select DISTINCT departure from deal_departure order by departure", function(err, cityD) {
                    if (!err) {
                        var city = cityD.recordset[0].departure;
                        // OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY
                        var searchS = "select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id left join deal_departure depa on date.deal_departure_id=depa.id  where depa.departure='" + city + "' order by de.destination  ";
                        requ.query(searchS, function(err, data) {
                            if (!err) {
                                res.send({ code: 200, status: 1, message: 'Deal data get successfully', data: data.recordset, city: cityD.recordset });
                                return;
                            } else {
                                console.log('Error for selecting data from data base', err);
                                res.send({ code: 422, status: 0, message: 'Error for selecting data from data base' });
                                return;
                            }
                        })
                    } else {
                        res.send({ code: 422, status: 0, message: 'Error for connection' });
                        console.log('Error for connnection', err);
                        return;
                    }
                });
            } else {
                console.log('Without City');
                requ.query(SearchQue, function(err, data) {
                    if (!err) {
                        res.send({ code: 200, status: 1, message: 'Deal data get successfully', data: data.recordset });
                        return;
                    } else {
                        console.log('Error for selecting data from data base', err);
                        res.send({ code: 422, status: 0, message: 'Error for selecting data from data base' });
                        return;
                    }
                })
            }
        } else {
            console.log('Error for connection', err);
            res.send({ code: 500, status: 0, message: 'Connection Error' });
            return;
        }
    })
}

exports.getDeparture = function(req, res) {
    console.log('************* calling  getDeparture *************');
    pool.close();
    pool.connect(function(err, connection) {
        if (!err) {
            requ.query("select DISTINCT departure from deal_departure order by departure", function(err, cityD) {
                if (!err) {
                    console.log('Deal data get successs');
                    res.send({ code: 200, status: 1, message: 'Deal data get successfully', data: cityD.recordset });
                    return;
                } else {
                    console.log('Error for get data from departture', err);
                    res.send({ code: 422, status: 0, message: 'Error for get data from departure' });
                    return;
                }
            });
        } else {
            res.send({ code: 422, status: 0, message: 'Error for connection' });
            console.log('Error for connnection', err);
            return;
        }
    })
}

exports.getDestination = function(req, res) {
    pool.close();
    var destination = req.params.destination;
    console.log('************* calling  getDestination *************', destination);

    pool.connect(function(err, connection) {
        if (!err) {
            // requ.query("select DISTINCT destination from deal", function(err, cityD) {
            requ.query("select DISTINCT d.destination from deal_departure de left join deal d on de.deal_id = d.id where de.departure = '" + destination + "' order by d.destination", function(err, cityD) {
                if (!err) {
                    var Citydata = [];
                    for (var i = 0; i < cityD.recordset.length; i++) {
                        if (cityD.recordset[i].destination == null) {} else {
                            Citydata.push(cityD.recordset[i]);
                        }
                    }
                    console.log('Destination data get successs');
                    res.send({ code: 200, status: 1, message: 'Destination data get successfully', data: Citydata });
                    return;
                } else {
                    console.log('Error for get data from departture', err);
                    res.send({ code: 422, status: 0, message: 'Error for get data from destination' });
                    return;
                }
            });
        } else {
            res.send({ code: 422, status: 0, message: 'Error for connection' });
            console.log('Error for connnection', err);
            return;
        }
    })
}

exports.getwithYear = function(req, res) {
    var date = req.params.date;
    console.log('date', date);
    var short = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    var year = date.split('-')[1];
    var month = short.indexOf(date.split('-')[0]) + 1;
    pool.close();
    pool.connect(function(err, connnection) {
        if (!err) {
            var SearchQue = "select date.*,depa.*,de.* from deal_dates date left join deal de on date.deal_id=de.id right join deal_departure depa on date.deal_departure_id=depa.id where  '" + year + "' between YEAR(date.date_from) and YEAR(date.date_to) and '" + month + "' between MONTH(date.date_from) and MONTH(date.date_to) order by de.destination"

            requ.query(SearchQue, function(err, data) {
                if (!err) {
                    res.send({ code: 200, status: 1, message: 'Deal data get successfully', data: data.recordset });
                    return;
                } else {
                    console.log('Error for selecting data from data base', err);
                    res.send({ code: 422, status: 0, message: 'Error for selecting data from data base' });
                    return;
                }
            })
        } else {
            console.log('Error for connection', err);
        }
    })
}


// var date = 'feb-2018';;
// var short = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
//     'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
// ];
// var year = date.split('-')[1];
// var month = short.indexOf(date.split('-')[0]) + 1;
// pool.close();
// pool.connect(function(err, connnection) {
//     if (!err) {
//         var SearchQue = "select d.*,de.* from deal d right join deal_departure de on d.id=de.deal_id"

//         requ.query(SearchQue, function(err, data) {
//             if (!err) {
//                 console.log('data', data.recordset.length);
//                 var total = 0;
//                 for (var i = 0; i < data.recordset.length; i++) {
//                     if (data.recordset[i].departure == "" || data.recordset[i].departure == null) {
//                         total = total + 1;
//                         console.log('blank data', data.recordset[i]);
//                     }
//                 }
//                 console.log('total', total);
//             } else {
//                 console.log('Error for selecting data from data base', err);
//             }
//         })
//     } else {
//         console.log('Error for connection', err);
//     }
// })

// var SearchQue = "select DISTINCT d.destination from deal_departure de left join deal d on de.deal_id = d.id";
// pool.close();
// pool.connect(function(err, connection) {
//     if (!err) {
//         requ.query(SearchQue, function(err, data) {
//             if (!err) {
//                 console.log('data', data.recordset.length);
//                 var Citydata = [];
//                 for (var i = 0; i < data.recordset.length; i++) {
//                     if (data.recordset[i].destination == null) {
//                         console.log('data', data.recordset[i]);

//                         // requ.query('delete from deal_dates where id=' + data.recordset[i].deal_dates_id, function(err, del) {
//                         //     if (!err) {
//                         //         console.log('Delete');
//                         //     } else {
//                         //         console.log('Error for delete', err);
//                         //     }
//                         // })
//                     } else {
//                         Citydata.push(data.recordset[i]);
//                     }
//                 }
//                 console.log('Citydata', Citydata);

//             } else {
//                 console.log('Error for selecting data from data base', err);
//                 return;
//             }
//         })
//     } else {
//         console.log('Connection error', err);
//         return;
//     }
// });