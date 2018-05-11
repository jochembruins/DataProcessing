/*
* scatter.js
*
* Jochem Bruins - 10578811
*
* Loads a scatterplot into scatter.html.
*/
	
// list that will store all data point
var dataList = []

/*
* Function that starts loading the data while loading the page.
*/
window.onload = function() {

  	getData()
};	


/*
* Requests the data from the OECD API.
*/
function getData() {	
	
	// urls to API requests
	var unemployement = 'unemp.json'
	var health = 'health.json'
	var ready = []

	// request both datafiles and wait till both loader
	queue(2)
	    .defer(d3.json, "unemp.json")
	    .defer(d3.json, "health.json")
	    .awaitAll(convertData);
};	  

function convertData(error, response) {
	
	if (error) throw error;
	
	// parse text into JSON 
	var dataUnemployment = response[0].data
	var dataHealth = response[1].data

	var dataAlcohol = dataHealth.filter(function(x) {return x.TYPE == "Alcohol consumption"});
	var dataTobacco = dataHealth.filter(function(x) {return x.TYPE == "Tobacco consumption"});

	dataMain = dataAlcohol
	dataMain.forEach(function(main) {
	    var resultTobacco = dataTobacco.filter(function(tobacco) {
    		return tobacco.COU === main.COU &&
        	tobacco.YEAR === main.YEAR;
		});
		if (resultTobacco.length > 0) {
			main.TOBACCO = Number(resultTobacco[0].AMOUNT)
		} else {
			main.TOBACCO = null
		};
		
		var resultUnemp = dataUnemployment.filter(function(unemp) {
    		return unemp.COU === main.COU &&
        	unemp.YEAR === main.YEAR;
		});
		if (resultUnemp.length > 0) {
			main.UNEMPLOYMENT = Number(resultUnemp[0].UNEMPLOYMENT)
		} else {
			main.UNEMPLOYMENT = null
		}
		main.ALCOHOL = Number(main.AMOUNT)
		delete main.AMOUNT
		delete main.TYPE
	});
	
	var dataFiltered = dataMain.filter(function(x) {return x.YEAR == "2014"});

	makeLine(dataMain)
	makeDataMap(dataFiltered)
};



/*
* Draws the plot.
*/
function makeDataMap(data) {

	// Datamaps expect data in format:
    // { "USA": { "fillColor": "#42a844", numberOfWhatever: 75},
    //   "FRA": { "fillColor": "#8dc386", numberOfWhatever: 43 } }
    var dataset = {};

    // create color palette function
    // color can be whatever you wish
	var ColorScale = d3.scale.linear()
		.domain([d3.min(data, function(d) { 
			return Number(d.UNEMPLOYMENT); 
		}), 
		d3.max(data, function(d) { 
			return Number(d.UNEMPLOYMENT); 
		})])
		.interpolate(d3.interpolateHcl)
		.range([d3.rgb("#9ecae1"), d3.rgb("#08306b")]);


    // fill dataset in appropriate format
    data.forEach(function(item){ //
        // item example value ["USA", 70]
        var iso = item.COU,
        	valueUnemp = Number(item.UNEMPLOYMENT),
        	valueAlcohol = item.ALCOHOL,
        	valueTobacco = item.TOBACCO;
        dataset[iso] = { cou: item.COU, unemployment: valueUnemp, alcohol: valueAlcohol, tobacco : valueTobacco, fillColor: ColorScale(valueUnemp) };
    });

    makeMap(dataset)
}


function makeMap(dataset) {
	
	var heightMap = 600
	var widthMap = 800

	var div = d3.select("#container")
		.style("width", widthMap + 'px')
		.style("height", heightMap + 'px')
		.style("position", "relative");

	
	var map = new Datamap({
		element: document.getElementById('container'),
		scope: 'world',
		fills: {
            defaultFill: 'rgba(230,230,230,0.9)' // Any hex, color name or rgb/rgba value
        },
		// Zoom in on Africa
		setProjection: function(element) {
			var projection = d3.geo.mercator()
				.center([8, 53])
				.scale(widthMap / 1.3)
				.translate([widthMap / 2, heightMap / 2]);
			var path = d3.geo.path()
				.projection(projection);

			return {path: path, projection: projection}
		},
		data: dataset,
        geographyConfig: {
            borderColor: '#DEDEDE',
            highlightBorderWidth: 1.5,
            // don't change color on mouse hover
            highlightFillColor: function(geo) {
                return geo['fillColor'] || '#F5F5F5';
            },
            // only change border
            highlightBorderColor: '#B7B7B7',
            // show desired information in tooltip
            popupTemplate: function(geo, data) {
                // don't show tooltip if country don't present in dataset
                if (!data) { return ; }
                // tooltip content
                return ['<div class="hoverinfo">',
                    '<strong>', geo.properties.name, '</strong>',
                    '<br>Liters of alcohol per year: <strong>', data.alcohol, '</strong>',
                    '<br>Grams Tobacco per year: <strong>', data.tobacco, '</strong>',
                    '<br>Unemployment: <strong>', data.unemployment.toFixed(2), '</strong>',
                    '</div>'].join('');
            }
        	
        },
        done: function(map) {
      		map.svg.selectAll('.datamaps-subunit').on('click', function(geo) {
        		var localData = map.options.data[geo.id]
        		if (localData && localData.unemployment) {
          			var country = localData.cou
          			updateLine(country, dataset)
          		}
          	})
        }  	
	})
}

function makeLine(data) {

	dataCountry = dataMain.filter(function(x) {return x.COU == "CZE"});

	var heightDiv = 200
	var widthDiv = 800
	
    var margin = {top: 20, right: 30, bottom: 30, left: 30};
    var height = heightDiv - margin.top - margin.bottom;
    var width = widthDiv - margin.left - margin.right;

	var svg = d3.select("#container2")
		.append("svg")
		.attr("class", "linegraph")
    	.attr("width", width + margin.left + margin.right)
    	.attr("height", height + margin.top + margin.bottom)
  		.append("g")
    		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    var parseTime = d3.time.format("%Y").parse;
    
    dataCountry.forEach(function(d) {
      		d.YEAR = parseTime(d.YEAR);
    })

   
    x = d3.time.scale()
    			.range([0, width])
    			.domain(d3.extent(dataCountry, function(d) { return d.YEAR; }));
	
	// Define the axes
	xAxis = d3.svg.axis().scale(x)
	    			.orient("bottom")
	    			.ticks(16)
	    			.tickSize(-height, 0, 0)

	svg.append("g")
		.attr("class", "axis") 
		.call(xAxis)
		.attr("transform", "translate(0," + (height) + ")");
	
	y1 = d3.scale.linear()
				.range([height, 0])
				.domain([0, d3.max(dataCountry, function(d) { return d.UNEMPLOYMENT; })]);

	y2 = d3.scale.linear()
				.range([height, 0])
				.domain([0, d3.max(dataCountry, function(d) { return d.ALCOHOL; })]);

	y3 = d3.scale.linear()
				.range([height, 0])
				.domain([0, d3.max(dataCountry, function(d) { return d.TOBACCO; })]);
	    			       		

   	line1 = d3.svg.line()
    			.x(function(d) { return x(d.YEAR); })
    			.y(function(d) { return y1(d.UNEMPLOYMENT); });

   	line2 = d3.svg.line()
    			.x(function(d) { return x(d.YEAR); })
    			.y(function(d) { return y2(d.ALCOHOL); });

   	line3 = d3.svg.line()
    			.x(function(d) { return x(d.YEAR); })
    			.y(function(d) { return y3(d.TOBACCO); });

    svg.append("path")
    	.attr("d", line1(dataCountry))
    	.attr("class", "line1");

    svg.append("path")
    	.attr("d", line2(dataCountry))
    	.attr("class", "line2");
    	

    svg.append("path")
    	.attr("d", line3(dataCountry))
    	.attr("class", "line3");
    	

}

function updateLine(country, data) {

    dataCountry = dataMain.filter(function(data) {return data.COU == country})
    console.log(dataCountry)
    if (dataCountry){
    	

    	x.domain(d3.extent(dataCountry, function(d) { return d.YEAR; }));    
    
   	 	y1.domain([0, d3.max(dataCountry, function(d) { return d.UNEMPLOYMENT; })]);

		y2.domain([0, d3.max(dataCountry, function(d) { return d.ALCOHOL; })]);

		y3.domain([0, d3.max(dataCountry, function(d) { return d.TOBACCO; })]);

    }

        // // Scale the range of the data again
        // x.domain(d3.extent(data, function(d) { return d.UNEMPLOYMENT; }));
        // y1.domain([0, d3.max(data, function(d) { return d.close; })]);
    


    // Select the section we want to apply our changes to
    var svg = d3.select("body").transition();

    // Make the changes
    svg.select(".line1")   // change the line
        .duration(750)
        .attr("d", line1(dataCountry));
    svg.select(".line2")   // change the line
        .duration(750)
        .attr("d", line2(dataCountry));
    svg.select(".line3")   // change the line
        .duration(750)
        .attr("d", line3(dataCountry));
    svg.select("axis") // change the x axis
        .duration(750)
        .call(xAxis);

}

	


