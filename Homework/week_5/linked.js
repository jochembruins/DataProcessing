/*
* linked.js
*
* Jochem Bruins - 10578811
*
* Loads a map and line graph into linked.html
*/

/*
* Function that starts loading the data while loading the page.
*/
window.onload = function() {
	getData();
};

 
/*
* Requests the data from own server.
*/
function getData() {	
	// path to files
	var unemployement = 'unemp.json';
	var health = 'health.json';
	var ready = [];

	// request both datafiles and wait till both loaded
	queue(2)
		.defer(d3.json, "unemp.json")
		.defer(d3.json, "health.json")
		.awaitAll(convertData);
};	


/*
* Converts and merges both datasets.
*/
function convertData(error, response) {
	
	if (error) throw error;
	
	// get the data
	var dataUnemployment = response[0].data;
	var dataHealth = response[1].data;

	// devide dataHealth into two files, alcohol and tobacco
	dataMain = dataHealth.filter(function(x) {return x.TYPE == "Alcohol consumption"});
	var dataTobacco = dataHealth.filter(function(x) {return x.TYPE == "Tobacco consumption"});

	// make variable to parse time
	var parseTime = d3.time.format("%Y").parse;

	// merge data if country and year are the same
	dataMain.forEach(function(main) {
		// find arrays that should merge
		var resultTobacco = dataTobacco.filter(function(tobacco) {
			return tobacco.COU === main.COU &&
			tobacco.YEAR === main.YEAR;
		});
		
		// merge amount of tobacco
		if (resultTobacco.length > 0) {
			main.TOBACCO = Number(resultTobacco[0].AMOUNT);
		} else {
			main.TOBACCO = undefined;
		};
		
		// find arrays that should merge
		var resultUnemp = dataUnemployment.filter(function(unemp) {
			return unemp.COU === main.COU &&
			unemp.YEAR === main.YEAR;
		});
		
		// merge unemployement rate
		if (resultUnemp.length > 0) {
			main.UNEMPLOYMENT = Math.round((Number(resultUnemp[0].UNEMPLOYMENT)) * 100) / 100;
		} else {
			main.UNEMPLOYMENT = undefined;
		}
		
		// convert alcohol to a number
		main.ALCOHOL = Number(main.AMOUNT);
		
		// convert time for x axis
		main.YEAR = parseTime(main.YEAR);

		// delete non used of duplicate values
		delete main.AMOUNT;
		delete main.TYPE;
	});

	// filter data for making the map
	var dataFiltered = dataMain.filter(function(x) {return x.YEAR.getFullYear() == 2014});

	// call function that makes data ready for the map
	makeDataMap(dataFiltered);

	// call function to make line graph
	makeLine(dataMain);
};


/*
* Prepares the data for drawing the map.
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
		dataset[iso] = { cou: item.COU, unemployment: valueUnemp, alcohol: valueAlcohol, 
						 tobacco : valueTobacco, fillColor: ColorScale(valueUnemp) };
	});

	// call function that makes the map 
	makeMap(dataset);
};


/*
* Draws the map.
*/
function makeMap(dataset) {
	
	// height and width
	var heightMap = 600;
	var widthMap = 800;

	// adjust div with height and width
	var div = d3.select("#containermap")
		.style("width", widthMap + 'px')
		.style("height", heightMap + 'px')
		.style("position", "relative");

	
	// draw the map
	var map = new Datamap({
		element: document.getElementById('containermap'),
		scope: 'world',
		fills: {
			defaultFill: 'rgba(230,230,230,0.9)' 
		},
		// zoom in on Europe
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
		// style for the map
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
					'<br>Unemployment: <strong>', data.unemployment, '</strong>',
					'</div>'].join('')
			}
		},
		// function that returns country id user clicked on 
		done: function(map) {
			map.svg.selectAll('.datamaps-subunit').on('click', function(geo) {
				var localData = map.options.data[geo.id]
				if (localData && localData.unemployment) {
					var country = localData.cou
					// filter data for country
					dataCountry = dataMain.filter(function(data) {return data.COU == country})
					// calls funtion to update line graph
					updateLine(country, dataCountry)
				};
			});
		}
	});
	// info for legend
	var colorHash = [JSON.parse('{"string":"Low unemployment", "color":"#91bfdb"}'), 
					JSON.parse('{"string":"Heigh unemployment", "color":"#08306b"}'),
					JSON.parse('{"string":"Not available for this year", "color":"black"}')];

	// draw legend
	var legend = map.svg.append("g")
		.selectAll("g")
		.data(colorHash)
		.enter()
		.append('g')
		.each(function(d,i){
			var g = d3.select(this);
				g.append("rect")
					.attr("x", 15)
					.attr("y", heightMap - i * 25 - 20)
					.attr("width", 10)
					.attr("height",10)
					.style("fill",colorHash[i].color);
				g.append("text")
					.attr("x", 30)
					.attr("y", heightMap - i * 25 - 10)
					.attr("height", 30)
					.attr("width", 100)
					.style("fill", "black")
					.text(colorHash[i].string);
		});
};


/*
* Updates the map when slider is changed.
*/
function updateMap(year) {
	// updates the current yearabove the map
	d3.select("#ex6SliderVal").html(year);

	// filters data for selected year
	dataYear = dataMain.filter(function(x) {return x.YEAR.getFullYear() == year});
	
	// reload plot with filtered data for that year (update function was not working)
	var map = d3.select("svg")
		.remove(makeDataMap(dataYear));
};


/*
* Draws a line graph for one country: NLD.
*/
function makeLine(dataLine) {

	// filters data for country
	dataCountry = dataLine.filter(function(x) {return x.COU == "NLD"});
	
	// height, width and margins
	var heightDiv = 250
	var widthDiv = 800
	var margin = {top: 40, right: 30, bottom: 30, left: 30};
	height = heightDiv - margin.top - margin.bottom;
	width = widthDiv - margin.left - margin.right;

	// add svg to div
	var svg = d3.select("#containerline")
		.append("svg")
		.attr("class", "linegraph")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
 // get range and domain for x-axis
	x = d3.time.scale()
		.range([0, width])
		.domain(d3.extent(dataCountry, function(d) { return d.YEAR; }));
	
	// define the axes
	xAxis = d3.svg.axis().scale(x)
		.orient("bottom")
		.ticks(16)
		.tickSize(-height, 0, 0);

	// add axis to graph
	svg.append("g")
		.attr("class", "axis") 
		.call(xAxis)
		.attr("transform", "translate(0," + (height) + ")");
	
	
	// define range and domain for y-axis for all three lines
	yUnemp = d3.scale.linear()
		.range([height, 0])
		.domain([0, d3.max(dataCountry, function(d) { return d.UNEMPLOYMENT; })]);

	yAlcohol = d3.scale.linear()
		.range([height, 0])
		.domain([0, d3.max(dataCountry, function(d) { return d.ALCOHOL; })]);

	yTobacco = d3.scale.linear()
		.range([height, 0])
		.domain([0, d3.max(dataCountry, function(d) { return d.TOBACCO; })]);
						 		
 	// Define the three lines
	lineUnemp = d3.svg.line()
		.defined(function(d) { return d.UNEMPLOYMENT; })
		.x(function(d) { return x(d.YEAR); })
		.y(function(d) { return yUnemp(d.UNEMPLOYMENT); });

 	lineAlcohol = d3.svg.line()
		.defined(function(d) { return d.ALCOHOL; })
		.x(function(d) { return x(d.YEAR); })
		.y(function(d) { return yAlcohol(d.ALCOHOL); });

 	lineTobacco = d3.svg.line()
		.defined(function(d) { return d.TOBACCO; })
		.x(function(d) { return x(d.YEAR); })
		.y(function(d) { return yTobacco(d.TOBACCO); });

	// append lines to scvg
	svg.append("path")
		.attr("d", lineUnemp(dataCountry))
		.attr("class", "line lineUnemp");

	svg.append("path")
		.attr("d", lineAlcohol(dataCountry))
		.attr("class", "line lineAlcohol");
		
	svg.append("path")
		.attr("d", lineTobacco(dataCountry))
		.attr("class", "line lineTobacco");

	tooltip = d3.select('#tooltip');
	
	tooltipLine = svg.append('line')
		.attr("class", "tooltipline");
	
	tipBox = svg.append('rect')
		.attr('width', widthDiv)
		.attr('height', heightDiv)
		.attr('opacity', 0)
		.on('mousemove', drawTooltip)
		.on('mouseout', removeTooltip);

	
	// adds title to the graph
	var title = svg.append("text")
		.attr("class", "linetitle")
		.attr("x", width / 2)
		.attr("y", - margin.top / 3)
		.text(dataCountry[0].COUNTRY)
		.style("text-anchor", "middle")
		.style("font-size", "25px");

	// info for legend
	var colorHash = [JSON.parse('{"string":"Percentage Unemployed", "color":"#91bfdb"}'), 
					JSON.parse('{"string":"Liters of alcohol per year per person", "color":"#ffffbf"}'),
					JSON.parse('{"string":"Grams of tobacco per year per person ", "color":"#fc8d59"}')];

	// draw legend
	var legend = svg.append("g")
		.selectAll("g")
		.data(colorHash)
		.enter()
		.append('g')
		.each(function(d,i){
			var g = d3.select(this);
				g.append("rect")
					.attr("x", width - margin.right - 270)
					.attr("y", height - i * 25 - 20)
					.attr("width", 10)
					.attr("height",10)
					.style("fill",colorHash[i].color);
				g.append("text")
					.attr("x", width - margin.right - 255)
					.attr("y", height - i * 25 - 10)
					.attr("height", 30)
					.attr("width", 100)
					.style("fill", "black")
					.text(colorHash[i].string);
		});


};

/*
* Function that draws tooltip when mouse is on the line graph.
*/
function drawTooltip() {
	// variable to get location year close by mouse on the x-axis
	bisectDate = d3.bisector(function(d) { return d.YEAR; }).left;

	// get the location and the matching data
	var x0 = x.invert(d3.mouse(this)[0]),
		i = bisectDate(dataCountry, x0, 1),
		d0 = dataCountry[i - 1],
		d1 = dataCountry[i],
		dataTooltip = d1 != undefined && x0 - d0.YEAR > d1.YEAR - x0 ? d1 : d0;

	// draw vertical line on mouse location
	tooltipLine
		.attr('stroke', 'black')
		.attr('x1', x(dataTooltip.YEAR))
		.attr('x2', x(dataTooltip.YEAR))
		.attr('y1', 0)
		.attr('y2', height);

	// make tooltip for mouse location with matching data
	tooltip
		.html('Liters of alcohol per year: <strong>' + dataTooltip.ALCOHOL + '</strong><br>Grams Tobacco per year: <strong>'
				+ dataTooltip.TOBACCO + '</strong><br>Unemployment: <strong>' + dataTooltip.UNEMPLOYMENT + '</strong>')
		.style('display', 'block')
		.style('left', (d3.event.pageX + 20) + "px")
		.style('top', (d3.event.pageY + 20) + "px")
		.style("visibility", "visible");
};

/*
* Hides tooltip when mouse is off.
*/
function removeTooltip() {
	if (tooltip) tooltip.style("visibility", "hidden");
	if (tooltipLine) tooltipLine.attr('stroke', 'none');
};


/*
* Updates line when clicked on a country.
*/
function updateLine(country, dataUpdate) {
	// update domains and axis if data is available
	if (dataUpdate){
		// domain x axis
		x.domain(d3.extent(dataUpdate, function(d) { return d.YEAR; })); 

		// define the x-axis
		xAxis = d3.svg.axis().scale(x)
			.orient("bottom")
			.ticks(16)
			.tickSize(-height, 0, 0); 
	
 	 	// domains
		yUnemp.domain([0, d3.max(dataUpdate, function(d) { return d.UNEMPLOYMENT; })]);

		yAlcohol.domain([0, d3.max(dataUpdate, function(d) { return d.ALCOHOL; })]);

		yTobacco.domain([0, d3.max(dataUpdate, function(d) { return d.TOBACCO; })]);
	};

	// select svg
	var svg = d3.select("body").transition();
	
	// update the lines and the x-axis.
	svg.select(".lineUnemp")
		.duration(750)
		.attr("d", lineUnemp(dataUpdate));
	svg.select(".lineAlcohol") 
		.duration(750)
		.attr("d", lineAlcohol(dataUpdate));
	svg.select(".lineTobacco")
		.duration(750)
		.attr("d", lineTobacco(dataUpdate));
	svg.select(".axis") 
		.duration(750)
		.call(xAxis);
	svg.select(".linetitle")
		.text(dataCountry[0].COUNTRY);
};


	


