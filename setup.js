(function () {
  console.log("hello");
  var params = "?fmt=json&api_key=prdnysqjp9tq5fgusfm44rb8";
  var v1Url = "https://api.edmunds.com/v1/api";
  var mainUrl = "https://api.edmunds.com/api";
  var queriesQ = []; // all GETs
  var queryId = 0;
  var isDebug = true;
  var masterObj = {};

  startQueryThrottling();
  testRun();

  function testRun() { 
    var testMake = "200002038"; //test on Acura
    queueQuery(modelsTCO(testMake), function(data){
      $.each( data, function(key, model) { //loop through each model
        log("looping model: "+model);
        $.each(model.years, function(yearType, yearsArr) { //loop through each yearType
          log("looping yearType: "+yearType);
          yearsArr.forEach(function(year){ //loop through each year
            log("looping year: "+year);
            console.log(stylesTCO(niceMake, model.nicemodel, year, model.submodel));
          });
        });
      });
    });
  }

  function testQuery() {
    var testMake = "200002038";
    $.get(modelsTCO(testMake), function( data ) {
      console.log(data);
    }, "json");
  }
  
  //makes = data.makes["Acura"].id .name .niceName
  //models = data.models["ilx:Hybrid"].id .link .model .name .nicemodel .nicesubmodel .submodel .years["NEW"] ["NEW_USED"] ["USED"][2011,2012,etc]

  function executeQuery(qObj) {
    log("starting query "+qObj.id);
    $.get(qObj.url)
      .success(function(data){
        log("Query "+qObj.id+" successful");
        qObj.callback(data);
      })
      .error(function(jqXHR, textStatus, errorThrown) { 
        log("Query "+qObj.id+" FAILED: "+jqXHR.statusText, true);
      });
    //remove from stack
  }

  function allMakesTCO() {
    return v1Url + "/tco/getmakeswithtcodata"+params;
  }
  function modelsTCO(makeId) {
    return v1Url + "/tco/getmodelswithtcodata"+params+"&makeid="+makeId;
  }
  function stylesTCO(makeNice, modelNice, year, submodel) {
    return v1Url+"/tco/getstyleswithtcodatabysubmodel"+params+"&make="+makeNice+"&model="+modelNice+"&year="+year+"&submodel="+submodel;
  }
  function getTCO(styleId, zip, state, isNew){
    return mainUrl+"/tco/v1/details/allusedtcobystyleidzipandstate/"+styleId+"/"+zip+"/"+state+params;
  }

  function startQueryThrottling() {
    setInterval(function(){
      if(queriesQ.length > 0){
        log(queriesQ.length + " queries in queue");
        executeQuery(queriesQ.pop()); //dequeue and execute
      }
    }, 500);
  }

  function queueQuery(url, callback) { //only simple GETs with url
    var temp = {};
    temp.id = queryId++;
    temp.url = url;
    temp.callback = callback;
    queriesQ.unshift(temp);
    log("Added Query "+temp.id+" to queue");
  }

  function log(msg, override, obj) {
    if(isDebug || override){
      console.log(msg);
    }
  }

/**************************************************************
*************   TESTS   ***************************************
**************************************************************/

  //Test the queue and throttle with netbug on :2134
  function unitTestThrottle() {
    queueQuery("http://localhost:2134?q=1", function(data) {
      log("I got 1");
    });

    queueQuery("http://localhost:2134?q=2", function(data) {
      log("I got 2");
    });  

    queueQuery("http://localhost:2134?q=foo3", function(data) {
      log("I got foo3");
      queueQuery("http://localhost:2134?q=bar4.5", function(data) {
        log("I got bar4.5");
      });
    });
    queueQuery("http://localhost:2134?q=5", function(data) {
      log("I got 5");
    });
    queueQuery("http://localhost:2134?q=6", function(data) {
      log("I got 6");
    });
    queueQuery("http://localhost:2134?q=7", function(data) {
      log("I got 7");
    });
    queueQuery("http://localhost:2134?q=8", function(data) {
      log("I got 8");
    });

    startQueryThrottling();
  }

})();
