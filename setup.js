(function () {
  console.log("hello");
  var params = "?fmt=json&api_key=prdnysqjp9tq5fgusfm44rb8";
  var v1Url = "https://api.edmunds.com/v1/api";
  var mainUrl = "https://api.edmunds.com/api";
  var dbUrl = "http://localhost:5984/vehicle-trends";
  var queriesQ = []; // all GETs
  var queryId = 0;
  var isDebug = true;
  var writeTimeout; //timeout for db write
  var commitWait; //interval to check queue before write
  var mainThrottle; //query throttle
  var masterObj = {};

  initQueue();
  /*Need to queue queries then start throttle. When queue=0 save data, stop throttle. reset after 24 hrs*/

  function initQueue() { 
    var testMake = "200002038"; //test on Acura TODO query Makes and save
    var testNiceMake = "acura";
    masterObj[testNiceMake] = {};
    queueQuery(modelsTCO(testMake), function(data){
      console.log(data);
      masterObj[testNiceMake].models = data.models;
      console.log("master+models "+testNiceMake, masterObj);
      $.each( data.models, function(key, model) { //loop through each model
        log("looping model: "+model);
        $.each(model.years, function(yearType, yearsArr) { //loop through each yearType
          log("looping yearType: "+yearType);
          $.each(yearsArr, function(yearIndex, year){ //loop through each year
            log("looping year: "+year);
            masterObj[testNiceMake].models[key].years[yearType] = {}; //setup the master obj
            masterObj[testNiceMake].models[key].years[yearType][year] = {};
            queueQuery(stylesTCO(testNiceMake, model.nicemodel, year, model.submodel), function(styleData){
              log("received style data for "+testNiceMake+key+year);
              masterObj[testNiceMake].models[key].years[yearType][year] = styleData; //save styles
              console.log("master+style "+year+key, masterObj);
              $.each(styleData.styles, function(styleName, styleObj) {
                console.log("adding tco query ", styleObj);
                queueQuery(getTCO(styleObj.id, '98053', 'WA', isNew(yearType)), function(tcoData){
                  console.log("gotTCO", tcoData);
                  masterObj[testNiceMake].models[key].years[yearType][year].styles[styleName].tco = tcoData;
                  console.log("master+tco ", masterObj);
                });
              });
            });
          });
        });
      });
    });
    startQueryThrottling();
  }

  function fakeQuery(blah, callback) {
    callback("I got this: " +blah);
  }

  function testQuery() {
    var testMake = "200002038";
    $.get(modelsTCO(testMake), function( data ) {
      console.log(data);
    }, "json");
  }

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
    if(isNew){
      return mainUrl+"/tco/v1/details/allnewtcobystyleidzipandstate/"+styleId+"/"+zip+"/"+state+params;
    }
    return mainUrl+"/tco/v1/details/allusedtcobystyleidzipandstate/"+styleId+"/"+zip+"/"+state+params;
  }

  function isNew(type){
    if (type === 'NEW'){
      return true;
    }
    return false;
  }

  function startQueryThrottling() {
    if (queriesQ.length === 0) {
      return; //do not start if there are no queries
    }
    mainThrottle = setInterval(function(){
      if(queriesQ.length > 0){
        log(queriesQ.length + " queries in queue");
        executeQuery(queriesQ.pop()); //dequeue and execute
      }
      else {
        log("QUEUE EMPTY; 2 MIN UNTIL DATA COMMIT;");
        enterCommitWaitLoop();
      }
    }, 550); // Max queries is 2ps
  }
  
  function enterCommitWaitLoop() {
    clearInterval(mainThrottle);
    writeTimeout = setTimeout(function(){ //wait 2 min just in case queries are slow.
      clearInterval(commitWait); //no need to check anymore
      writeToDb();
    }, 2*60*1000);
    commitWait = setInterval(function(){
      if(queriesQ.length > 0){
        console.log("LATE QUERY FOUND! CANCEL COMMIT!");
        clearTimeout(writeTimeout);
        clearInterval(commitWait);
        startQueryThrottling();
      }
    },200);
  }

  function writeToDb() {
    //TODO reschedule for tomorrow refresh
    console.log("writing to db ", masterObj); //write to db
    jQuery.support.cors = true;
    $.ajax({
      type: 'POST',
      contentType: 'application/json',
      crossDomain: true,
      url: dbUrl,
      data: JSON.stringify(masterObj),
      success: function(result) {
        console.log("finished write", result);
      }
    });
  }

  function purgeDb() {
    //TODO purge db once per day
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

})();
