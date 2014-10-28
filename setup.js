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
  var deDupeMasterCount = 0;
  var deDupeModelMasterCount = 0;

  //initQueue();

  function initQueue() { 
    queueQuery(allMakesTCO(), function(makeData){
      console.log(makeData);
      masterObj = makeData; //setup master
      $.each( makeData.makes, function(make, makeObj) { //loop through each make
//        var make = 'Acura'; //remove
//        var makeObj = makeData.makes[make]; //remove
        masterObj.makes[make].depAggs = {};
        masterObj.makes[make].depAggs.count = 0;
        masterObj.makes[make].depAggs.values = [0,0,0,0,0];
        queueQuery(modelsTCO(makeObj.id), function(data){
          console.log(data);
          masterObj.makes[make].models = deDupeModels(data.models);
          console.log("master+models "+make, masterObj);
          $.each( masterObj.makes[make].models, function(key, model) { //loop through each model
            log("looping model: "+key);
            masterObj.makes[make].models[key].depAggs = {};
            masterObj.makes[make].models[key].depAggs.count = 0;
            masterObj.makes[make].models[key].depAggs.values = [0,0,0,0,0];
            $.each(model.years, function(yearType, yearsArr) { //loop through each yearType
              log("looping yearType: "+yearType);
              masterObj.makes[make].models[key].years[yearType] = {}; //setup the master obj
              $.each(yearsArr, function(yearIndex, year){ //loop through each year
                masterObj.makes[make].models[key].years[yearType][year] = {};
                masterObj.makes[make].models[key].years[yearType][year].depAggs = {};
                masterObj.makes[make].models[key].years[yearType][year].depAggs.count = 0;
                masterObj.makes[make].models[key].years[yearType][year].depAggs.values = [0,0,0,0,0];
                log("looping year: "+year, masterObj);
                queueQuery(stylesTCO(makeObj.niceName, model.nicemodel, year, model.submodel), function(styleData){
                  log("received style data for "+make+key+year);
                  masterObj.makes[make].models[key].years[yearType][year].styles = deDupeStyles(styleData.styles); //save styles
                  console.log("master+style "+year+key, masterObj);
                  $.each(masterObj.makes[make].models[key].years[yearType][year].styles, function(styleName, styleObj) { //loop through each style
                    console.log("adding tco query ", styleObj);
                    queueQuery(getTCO(styleObj.id, '98053', 'WA', isNew(yearType)), function(tcoData){
                      console.log("gotTCO", tcoData);
                      masterObj.makes[make].models[key].years[yearType][year].styles[styleName].tco = tcoData;
                      console.log("master+tco ", masterObj);
                      buildAggregates(make, key, yearType, year, styleName, tcoData);
                    });
                  });
                });
              });
            });
          });
        });
      });//this one for just Acura
    });
    startQueryThrottling();
  }

  function isValidStyle(currentStyle) {
    if (currentStyle.toLowerCase().indexOf("w/") != -1)
      return false;
    if (currentStyle.toLowerCase().indexOf("technology") != -1)
      return false;
    if (currentStyle.toLowerCase().indexOf("package") != -1)
      return false;
    return true;
  }
  function deDupeStyles(styleData) {
    var deDupeCount = 0;
    console.log('deDuping styles', styleData);
    console.log('styles before: '+Object.keys(styleData).length);
    $.each(styleData, function(currentStyleKey, currentStyleObj) {
      if(isValidStyle(currentStyleKey)){
        $.each(styleData, function(nextStyleKey, nextStyleObj) {
          if(currentStyleKey.trim() != nextStyleKey.trim()){ //make sure not same obj
            if(currentStyleObj.trim.trim() === nextStyleObj.trim.trim()){ //are the trims the same?
              delete styleData[nextStyleKey];
              deDupeCount++;
            }
            if(nextStyleObj.trim.trim().indexOf(currentStyleObj.trim.trim()) != -1){ //does next trim contain current trim?
              delete styleData[nextStyleKey];
              deDupeCount++;
            }
            else if(currentStyleObj.styleLongName.trim().toLowerCase() === nextStyleObj.styleLongName.trim()){ //are longNames the same?
              delete styleData[nextStyleKey];
              deDupeCount++;
            }
            else if(longNameSimilar(currentStyleObj.styleLongName.trim(), nextStyleObj.styleLongName.trim())) { //longnames similar?
              delete styleData[nextStyleKey];
              deDupeCount++;
            }
          }
        });
      }
      else{
        delete styleData[currentStyleKey];
        deDupeCount++;
      }
    });
    deDupeMasterCount += deDupeCount;
    console.log('*******I deduped '+deDupeCount+' styles; RunningTOTAL: '+deDupeMasterCount+'*********');
    return styleData;
  }
  function deDupeModels(modelData) {
    var deDupeCount = 0;
    console.log('deDuping models ', modelData);
    console.log('models before: '+Object.keys(modelData).length);
    $.each(modelData, function(currentModelKey, currentModelObj) {
      $.each(modelData, function(nextModelKey, nextModelObj) {
        if(currentModelKey.trim() != nextModelKey.trim()){ //make sure not same obj
          if(nextModelKey.trim().indexOf(currentModelKey.trim()) != -1){ //does next model contain same name as current?
            delete modelData[nextModelKey];
            deDupeCount++;
          }
          else if(currentModelKey.trim().split(':')[0].toLowerCase() === nextModelKey.trim().split(':')[0].toLowerCase()){ //model prefix the same?
            delete modelData[nextModelKey];
            deDupeCount++;
          }
        }
      });
    });
    deDupeModelMasterCount += deDupeCount;
    console.log('*******I deduped '+deDupeCount+' MODELS; RunningTOTAL: '+deDupeModelMasterCount+'*********');
    return modelData;
  }  
  
  function longNameSimilar(current, next) {
    var needsMatch = Math.min(current.split(" ").length, next.split(" ").length);
    current.toLowerCase().split(" ").forEach(function(currentWord){
      next.toLowerCase().split(" ").forEach(function(nextWord){
        if(currentWord === nextWord){
          needsMatch--;
        }
      });
    });
    if (needsMatch > 0){
      return false;
    }
    else{
      return true;
    }
  }

  function buildAggregates(make, model, yearType, year, styleName, tcoData) {
    for(var i = 0; i < 5; i++){
      //agg the years
       masterObj.makes[make].models[model].years[yearType][year].depAggs.values[i] += tcoData.depreciation.values[i];
      //agg the models
       masterObj.makes[make].models[model].depAggs.values[i] += tcoData.depreciation.values[i];
      //agg the makes
       masterObj.makes[make].depAggs.values[i] += tcoData.depreciation.values[i];
    }
    console.log("aggregating "+make+model+year);
    masterObj.makes[make].models[model].years[yearType][year].depAggs.count++;
    masterObj.makes[make].models[model].depAggs.count++;
    masterObj.makes[make].depAggs.count++;
    console.log("built AGGs for: "+make+model+year+styleName, masterObj);
  }

  function fakeQuery(blah, callback) {
    callback("I got this: " +blah);
  }
///////////////////////////////////////////////////////////////////////
  //testQuery();
/////////////////////////////////////////////////////////////////////////
  function testQuery() {
    var testId = "101363579";
    $.get(getTCO(testId, '10065', 'WA', false), function( data ) {
      console.log('10065', data);
    }, "json");
    $.get(getTCO(testId, '48208', 'WA', false), function( data ) {
      console.log('48208', data);
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
    }, 560); // Max queries is 2ps
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
