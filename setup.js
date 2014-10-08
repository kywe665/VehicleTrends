(function () {
  console.log("hello");
  var key = "prdnysqjp9tq5fgusfm44rb8";
  var queriesQ = []; // all GETs
  var queryId = 0;
  var isDebug = true;

  function startQueryThrottling() {
    setInterval(function(){
      if(queriesQ.length > 0){
        log(queriesQ.length + " queries in queue");
        executeQuery(queriesQ.pop());
      }
    }, 500);
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
    //remove from stack
  }

  function addToQueue(url, callback) { //only simple GETs with url
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

  //Test the queue and throttle with netbug on :2134
  function unitTestThrottle() {
    addToQueue("http://localhost:2134?q=1", function(data) {
      log("I got 1");
    });

    addToQueue("http://localhost:2134?q=2", function(data) {
      log("I got 2");
    });  

    addToQueue("http://localhost:2134?q=foo3", function(data) {
      log("I got foo3");
      addToQueue("http://localhost:2134?q=bar4.5", function(data) {
        log("I got bar4.5");
      });
    });
    addToQueue("http://localhost:2134?q=5", function(data) {
      log("I got 5");
    });
    addToQueue("http://localhost:2134?q=6", function(data) {
      log("I got 6");
    });
    addToQueue("http://localhost:2134?q=7", function(data) {
      log("I got 7");
    });
    addToQueue("http://localhost:2134?q=8", function(data) {
      log("I got 8");
    });

    startQueryThrottling();
  }

/*
  function getAllMakesTCO() {
    var url = "https://api.edmunds.com/v1/api/tco/getmakeswithtcodata?fmt=json&api_key=";
    $.get(url+key, function( data ) {
      console.log(data);
    }, "json");
  }
*/
})();
