/*
* linked.js
*
* Jochem Bruins - 10578811
*
* Loads a map and line graph into linked.html
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
* Requests the data from own server
*/
function getData() {	
	
	// path to files
	var unemployement = 'unemp.json'
	var health = 'health.json'
	var ready = []

	// request both datafiles and wait till both loaded
	queue(2)
	    .defer(d3.json, "unemp.json")
	    .defer(d3.json, "health.json")
	    .awaitAll(convertData);
};	  

/*
* Converts and merges both datasets
*/
function convertData(error, response) {
	
	if (error) throw error;
	
    // get the data
	var dataUnemployment = response[0].data
	var dataHealth = response[1].data

	// devide dataHealth into two files, alcohol and tobacco
    var dataMain = dataHealth.filter(function(x) {return x.TYPE == "Alcohol consumption"});
	var dataTobacco = dataHealth.filter(function(x) {return x.TYPE == "Tobacco consumption"});

	// merge data if country and year are the same
    dataMain.forEach(function(main) {
	    // find arrays that should merge
        var resultTobacco = dataTobacco.filter(function(tobacco) {
    		return tobacco.COU === main.COU &&
        	tobacco.YEAR === main.YEAR;
		});
		// merge amount of tobacco
        if (resultTobacco.length > 0) {
			main.TOBACCO = Number(resultTobacco[0].AMOUNT)
        } else {
			main.TOBACCO = null
		};
		
		// find arrays that should merge
        var resultUnemp = dataUnemployment.filter(function(unemp) {
    		return unemp.COU === main.COU &&
        	unemp.YEAR === main.YEAR;
		});
		// merge unemployement rate
        if (resultUnemp.length > 0) {
			main.UNEMPLOYMENT = Number(resultUnemp[0].UNEMPLOYMENT)
		} else {
			main.UNEMPLOYMENT = null
		}
		// convert alcohol to a number
        main.ALCOHOL = Number(main.AMOUNT)
		
        // delete non used of duplicate values
        delete main.AMOUNT
		delete main.TYPE
	});
	
    // call function to make line graph
	makeLine(dataMain)

    // filter data for making the map
    var dataFiltered = dataMain.filter(function(x) {return x.YEAR == "2014"});

    // call function that makes data ready for the map
	makeDataMap(dataFiltered)
};



/*
* Prepares the data for drawing the map
*/
function makeDataMap(data) {

    // empty dataset to store info to draw map
    var dataset = {};

    // create color scale for color of countries
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
        var iso = item.COU,
        	valueUnemp = Number(item.UNEMPLOYMENT),
        	valueAlcohol = item.ALCOHOL,
        	valueTobacco = item.TOBACCO;
        dataset[iso] = { cou: item.COU, unemployment: valueUnemp, alcohol: valueAlcohol, tobacco : valueTobacco, fillColor: ColorScale(valueUnemp) };
    });

    // call function that makes the map. 
    makeMap(dataset)
}

/*
* Draws the map.
*/
function makeMap(dataset) {
	
	// height and width
    var heightMap = 600
	var widthMap = 800

	// adjust div with height and width
    var div = d3.select("#container")
		.style("width", widthMap + 'px')
		.style("height", heightMap + 'px')
		.style("position", "relative");

	
	// draw the map
    var map = new Datamap({
		element: document.getElementById('container'),
		scope: 'world',
		fills: {
            defaultFill: 'rgba(230,230,230,0.9)' 
        },
		// Zoom in on Europe
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
            highlightFillColor: function(geo) {
                return geo['fillColor'] || '#F5F5F5';
            },
            // change border on mouseover
            highlightBorderColor: '#B7B7B7',
            // show desired information in tooltip
            popupTemplate: function(geo, data) {
                // don't show tooltip if country is not in dataset
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
        // function that return country id user clicked on
        done: function(map) {
      		map.svg.selectAll('.datamaps-subunit').on('click', function(geo) {
        		var localData = map.options.data[geo.id]
        		if (localData && localData.unemployment) {
          			var country = localData.cou
          			// calls funtion to update line graph
                    updateLine(country, dataset)
          		}
          	})
        }  	
	})
}

/*
* Draws a line graph from CZE
*/
function makeLine(data) {

	// filters data for country
    dataCountry = dataMain.filter(function(x) {return x.COU == "CZE"});

	// height, width and margins
    var heightDiv = 200
	var widthDiv = 800
    var margin = {top: 20, right: 30, bottom: 30, left: 30};
    var height = heightDiv - margin.top - margin.bottom;
    var width = widthDiv - margin.left - margin.right;

	// add svg to div
    var svg = d3.select("#container2")
		.append("svg")
		.attr("class", "linegraph")
    	.attr("width", width + margin.left + margin.right)
    	.attr("height", height + margin.top + margin.bottom)
  		.append("g")
    		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    // convert time for x axis
    var parseTime = d3.time.format("%Y").parse;
    dataCountry.forEach(function(d) {
      		d.YEAR = parseTime(d.YEAR);
    })

   // get range and domain for x-axis
    x = d3.time.scale()
    			.range([0, width])
    			.domain(d3.extent(dataCountry, function(d) { return d.YEAR; }));
	
	// define the axes
	xAxis = d3.svg.axis().scale(x)
	    			.orient("bottom")
	    			.ticks(16)
	    			.tickSize(-height, 0, 0)

	// add axis to graph
    svg.append("g")
		.attr("class", "axis") 
		.call(xAxis)
		.attr("transform", "translate(0," + (height) + ")");
	
	
    // define range and domain for y-axis for all three lines
    y1 = d3.scale.linear()
				.range([height, 0])
				.domain([0, d3.max(dataCountry, function(d) { return d.UNEMPLOYMENT; })]);

	y2 = d3.scale.linear()
				.range([height, 0])
				.domain([0, d3.max(dataCountry, function(d) { return d.ALCOHOL; })]);

	y3 = d3.scale.linear()
				.range([height, 0])
				.domain([0, d3.max(dataCountry, function(d) { return d.TOBACCO; })]);
	    			       		

   	// Define the three lines
    line1 = d3.svg.line()
    			.x(function(d) { return x(d.YEAR); })
    			.y(function(d) { return y1(d.UNEMPLOYMENT); });

   	line2 = d3.svg.line()
    			.x(function(d) { return x(d.YEAR); })
    			.y(function(d) { return y2(d.ALCOHOL); });

   	line3 = d3.svg.line()
    			.x(function(d) { return x(d.YEAR); })
    			.y(function(d) { return y3(d.TOBACCO); });

    // append lines to scvg
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

/*
* Updates line when clicked on a country
*/
function updateLine(country, data) {

    // filter data for country
    dataCountry = dataMain.filter(function(data) {return data.COU == country})
    console.log(dataCountry)
    // update domains if data is available
    if (dataCountry){
    	

    	x.domain(d3.extent(dataCountry, function(d) { return d.YEAR; }));    
    
   	 	y1.domain([0, d3.max(dataCountry, function(d) { return d.UNEMPLOYMENT; })]);

		y2.domain([0, d3.max(dataCountry, function(d) { return d.ALCOHOL; })]);

		y3.domain([0, d3.max(dataCountry, function(d) { return d.TOBACCO; })]);

    }

    // select svg
    var svg = d3.select("body").transition();
    // update the lines and the x-axis.
    svg.select(".line1")  
        .duration(750)
        .attr("d", line1(dataCountry));
    svg.select(".line2")   
        .duration(750)
        .attr("d", line2(dataCountry));
    svg.select(".line3")
        .duration(750)
        .attr("d", line3(dataCountry));
    svg.select("axis") /
        .duration(750)
        .call(xAxis);

}

	


