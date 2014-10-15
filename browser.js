(function(){
  var now = new Date();
  var masterData = {};
  var myLineChart;
  var lineData = {
    labels: [now.getFullYear()+1, now.getFullYear()+2, now.getFullYear()+3, now.getFullYear()+4, now.getFullYear()+5],
    datasets: [
        {
            label: "Pick 1",
            fillColor: "rgba(220,220,220,0)",
            strokeColor: "rgba(210,0,0,1)",
            pointColor: "rgba(255,0,0,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(255,0,0,1)",
            data: [0, 0, 0, 0, 0]
        },
        {
            label: "Pick 2",
            fillColor: "rgba(151,187,205,0)",
            strokeColor: "rgba(0,210,0,1)",
            pointColor: "rgba(0,225,0,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(0,225,0,1)",
            data: [0, 0, 0, 0, 0]
        },
        {
            label: "Pick 3",
            fillColor: "rgba(151,187,205,0)",
            strokeColor: "rgba(0,0,210,1)",
            pointColor: "rgba(0,0,255,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(0,0,255,1)",
            data: [0, 0, 0, 0, 0]
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
    initCombos(1);
    initCombos(2);
    initCombos(3);
  }
  function bindEvents(){
    $('.update').on('click', function(){
      myLineChart.datasets[0].points[2].value = 50;
      myLineChart.update();
    });
    $('.update').on('click', function(){
      myLineChart.datasets[0].points[2].value = 50;
      myLineChart.update();
    });
  }

  function initCombos(num){
    var types = ['make', 'model', 'year', 'style'];
    types.forEach(function(type){
      $("#"+type+"-combobox"+"-"+num).combobox({ 
        select: function (event, ui) { 
          comboFunc(this.value, $(this).attr('id'), $('option:selected', this).attr('data-ref'));
        } 
      });
    });
  }
  function comboFunc(newVal, comboId, specialVal) {
    var type = comboId.split('-')[0];
    var comboIndex = comboId.split('-')[2];
    $('#'+type+'-combobox-'+comboIndex).attr('data-ref',specialVal);
    console.log(newVal+type+comboIndex);
    switch(type) {
      case 'make':
        makeSelected(newVal, comboIndex);
        break;
      case 'model':
        modelSelected(newVal, comboIndex);
        break;
      case 'year':
        yearSelected(newVal, comboIndex);
        break;
      case 'style':
        styleSelected(newVal, comboIndex);
        break;
      default:
        console.error('combo type matched none of the above...');
    }
  }

  function makeSelected(make, comboIndex){
    var comboId = 'model-combobox-'+comboIndex;
    var dataRef = masterData.makes[make];
    clearCombo(comboId);
    $.each(dataRef.models, function(modelKey, modelObj) {
      loadCombo(comboId, dataRef.models[modelKey].name, modelKey);
    });
    updateGraph(comboIndex, dataRef.depAggs);
  }
  
  function modelSelected(model, comboIndex){
    var comboId = 'year-combobox-'+comboIndex;
    var make = $('#make-combobox-'+comboIndex).val();
    var modelKey = $('#model-combobox-'+comboIndex).attr('data-ref');
    var dataRef = masterData.makes[make].models[modelKey];
    clearCombo(comboId);
    $.each(dataRef.years, function(yearType, yearTypeObj) {
      var yearTypeKey = yearType;
      yearType = yearType === 'NEW' ? 'New':'Used';
      $.each(yearTypeObj, function(year, yearObj) {
        loadCombo(comboId, year+"-"+yearType, yearTypeKey);
      });
    });
    updateGraph(comboIndex, dataRef.depAggs);
  }
  function yearSelected(year, comboIndex){
    var comboId = 'style-combobox-'+comboIndex;
    var make = $('#make-combobox-'+comboIndex).val();
    var modelKey = $('#model-combobox-'+comboIndex).attr('data-ref');
    var yearKey = $('#year-combobox-'+comboIndex).attr('data-ref');
    var dataRef = masterData.makes[make].models[modelKey].years[yearKey][year.split('-')[0]];
    clearCombo(comboId);
    $.each(dataRef.styles, function(styleKey, styleObj) {
      loadCombo(comboId, styleKey);
    });
    updateGraph(comboIndex, dataRef.depAggs);
  }
  function styleSelected(styleKey, comboIndex){
    var make = $('#make-combobox-'+comboIndex).val();
    var modelKey = $('#model-combobox-'+comboIndex).attr('data-ref');
    var yearKey = $('#year-combobox-'+comboIndex).attr('data-ref');
    var year = $('#year-combobox-'+comboIndex).val().split('-')[0];
    var dataRef = masterData.makes[make].models[modelKey].years[yearKey][year].styles[styleKey].tco.depreciation;
    updateGraph(comboIndex, dataRef);
  }

  function updateGraph(index, dataRef) {
    console.log('updating graph ', dataRef);
    dataRef.values.every(function(val, i){
      console.log('looping arr ', val, i);
      myLineChart.datasets[index-1].points[i].value = val/(dataRef.count || 1);
      return true;
    });
    myLineChart.update();
  }

  function getMakes(){
    $.get("http://localhost:5984/vehicle-trends/_design/temp/_view/temp")
      .success(function(data){
        data = JSON.parse(data).rows[1].value; //temp placeholder
        masterData = data;
        console.log("success", data);
        $.each(data.makes, function(makeName, makeObj) { //loop through each make
          $('.make-combo').each(function(index){
            loadCombo($(this).attr('id'), makeName);
          });
        });
      })
      .error(function(jqXHR, textStatus, errorThrown) { 
        console.log("Query FAILED: "+jqXHR.statusText);
      });
  }
  function loadCombo(id, makeName, special) {
    var option = '<option value="'+makeName+'" data-ref="'+special+'">'+makeName+'</option>';
    $('#'+id).append(option);
  }
  function clearCombo(id, makeName) {
    $('#'+id).html('');
  }

})();
