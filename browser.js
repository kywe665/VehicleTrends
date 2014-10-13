(function(){
  var now = new Date();
  var myLineChart;
  var lineData = {
    labels: [now.getFullYear()+1, now.getFullYear()+2, now.getFullYear()+3, now.getFullYear()+4, now.getFullYear()+5],
    datasets: [
        {
            label: "Make 1",
            fillColor: "rgba(220,220,220,0)",
            strokeColor: "rgba(220,220,220,1)",
            pointColor: "rgba(220,220,220,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(220,220,220,1)",
            data: [2650, 1590, 1080, 810, 506]
        },
        {
            label: "Make 2",
            fillColor: "rgba(151,187,205,0)",
            strokeColor: "rgba(220,220,220,1)",
            pointColor: "rgba(220,220,220,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(220,220,220,1)",
            data: [3650, 2590, 1800, 910, 806]
        }
    ]
  };
  var lineOptions = {
    bezierCurve : false
  };
  
  $( document ).ready(function() {
    console.log( "ready!" );
    setupElems();
    bindEvents();
  });
  function setupElems(){
    var ctx = $("#myChart").get(0).getContext("2d");
    myLineChart = new Chart(ctx).Line(lineData, lineOptions); //chart
    getMakes();
    $("#make-combobox").combobox(); //comboboxes
  }
  function bindEvents(){
    $('.update').on('click', function(){
      myLineChart.datasets[0].points[2].value = 50;
      myLineChart.update();
    });
  }

  function getMakes(){
    $.get("http://localhost:5984/vehicle-trends/_design/temp/_view/temp")
      .success(function(data){
        data = JSON.parse(data).rows[1].value; //temp placeholder
        console.log("success", data);
        
      })
      .error(function(jqXHR, textStatus, errorThrown) { 
        console.log("Query FAILED: "+jqXHR.statusText);
      });  
//  $.get("/database/_design/application/_view/viewname")
  }
})();