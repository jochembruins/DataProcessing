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
	var unemployement = 'http://stats.oecd.org/SDMX-JSON/data/KEI/LRHUTTTT.AUS+AUT+BEL+CAN+CHL+CZE+DNK+EST+FIN+FRA+DEU+GRC+HUN+ISL+IRL+ISR+ITA+JPN+KOR+LVA+LUX+MEX+NLD+NZL+NOR+POL+PRT+SVK+SVN+ESP+SWE+CHE+TUR+GBR+USA.ST.A/all?startTime=2016&endTime=2016&dimensionAtObservation=allDimensions&pid=3e7475ec-43a6-4b4a-94c6-c19cb1bbaef9'
	var betterLife = 'http://stats.oecd.org/SDMX-JSON/data/BLI2016/AUS+AUT+BEL+CAN+CHL+CZE+DNK+EST+FIN+FRA+DEU+GRC+HUN+ISL+IRL+ISR+ITA+JPN+KOR+LVA+LUX+MEX+NLD+NZL+NOR+POL+PRT+SVK+SVN+ESP+SWE+CHE+TUR+GBR+USA.SW_LIFS+WL_TNOW.L.TOT+MN+WMN/all?&dimensionAtObservation=allDimensions&pid=3e7475ec-43a6-4b4a-94c6-c19cb1bbaef9'

	// request both datafiles and wait till both loader
	d3.queue()
	  .defer(d3.request, unemployement)
	  .defer(d3.request, betterLife)
	  .awaitAll(convertData);
};	  

/*
* Stores the requested data into a list names dataList.
*/
function convertData(error, response) {
	
	if (error) throw error;
	
	// parse text into JSON 
	dataUnemployment = JSON.parse(response[0].responseText);
	dataBetterLife = JSON.parse(response[1].responseText);
	
	// get the amount of countries
	amountCountries = dataUnemployment.structure.dimensions.observation[1].values.length;

	// loop to extract all needed information from the JSON file
	for (i = 0; i < amountCountries; i++) {
		// store country name
		var countryName = dataUnemployment.structure.dimensions.observation[1].values[i].name;
		
		// store unemployement rate in variable
		var unempData = dataUnemployment.dataSets[0].observations['0:'+ i + ':0:0:0'][0];
		
		// store satisfaction in life in list for total, men and women
		var satisfaction = [dataBetterLife.dataSets[0].observations[i + ':0:0:0'][0],
							dataBetterLife.dataSets[0].observations[i + ':0:0:1'][0],
							dataBetterLife.dataSets[0].observations[i + ':0:0:2'][0]];
		
		// store time spent on leisure in list for total, men and women
		var leisure = [dataBetterLife.dataSets[0].observations[i + ':1:0:0'][0],
					   dataBetterLife.dataSets[0].observations[i + ':1:0:1'][0],
					   dataBetterLife.dataSets[0].observations[i + ':1:0:2'][0]];
		
		// combine everything into a new JSON object
		var obj = JSON.parse('{"country":"' + countryName + '", "unemployement":' + 
								Number(unempData) +', "satisfaction":[' + satisfaction +
								'], "leisure":[' + leisure + ']}');
		
		// push new object to list
		dataList.push(obj);
	}
	// call function to make plot with the data
	makePlot(dataList);
};

/*
* Draws the plot.
*/
function makePlot(dataList, genderSelection = 0) {
	
	// set siza and margin
	var margin = {top: 50, right: 50, bottom: 70, left: 70};
    var width  = 700;
    var height = 500;
    var padding = 15

	// determine X scale
	var xScale = d3.scaleLinear()
		.domain([0, d3.max(dataList, function(d) { 
			return d.unemployement; 
		})])
		.range([0, width])
		.nice();

	// determine Y scale
	var yScale = d3.scaleLinear()
		.domain([d3.min(dataList, function(d) { 
			return d.leisure[genderSelection]; 
		}), d3.max(dataList, function(d) { 
			return d.leisure[genderSelection]; 
		})])
		.range([height, 0])
		.nice();

	// determine color scale for circles
	var ColorScale = d3.scaleLinear()
		.domain([d3.min(dataList, function(d) { 
			return d.satisfaction[genderSelection]; 
		}), d3.max(dataList, function(d) { 
			return d.satisfaction[genderSelection]; 
		})])
		.interpolate(d3.interpolateHcl)
		.range([d3.rgb("#ece7f2"), d3.rgb("#2b8cbe")]);

	// add svg to body
	var svg = d3.select("body")
		.append("svg")
		.attr("class", "plot")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.style("display", "block")
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// create tooltip that will showe name of the country
	var tooltip = d3.select("body")
		.append("div")
		.attr("class", "tooltip")
		.style("position", "absolute")
		.style("visibility", "hidden")
	
	// determine X axis
	var xAxis = d3.axisBottom(xScale)
		.ticks(13)

	// determine Y axis
	var yAxis = d3.axisLeft(yScale)
		.ticks(10)

	// draw circles for scatterplot
	var circles = svg.selectAll("circle")
		.data(dataList)
		.enter()
		.append("circle")
		.attr("cx", function(d) {
        	return xScale(d.unemployement);
   		})
   		.attr("cy", function(d) {
        	return yScale(d.leisure[genderSelection]);
   		})
   		.attr("r", function(d) {
    		return Math.pow(d.satisfaction[genderSelection] , 1.3);
    	})
    	.attr("fill", function(d) {
    		return ColorScale(d.satisfaction[genderSelection])
    	})
    	.style("opacity", 0.7)
		
		// show tooltip when mouse is on circle
		.on("mouseover", function(d){
			return tooltip
				.style("visibility", "visible")
				.html(d.country);
			})
		.on("mousemove", function(d) {
			return tooltip
				.style("top", (event.pageY-10)+"px")
				.style("left",(event.pageX+10)+"px")
			;})
		.on("mouseout", function(d) {
			return tooltip
				.style("visibility", "hidden");
			});

	// draw X-axis
	svg.append("g")
		.attr("class", "axis") 
		.call(xAxis)
		.attr("transform", "translate(0," + (height + padding) + ")");

	// draw Y-axis
	svg.append("g")
		.attr("class", "axis") 
		.call(yAxis)
		.attr("transform", "translate(" + (padding / -1) + ", 0 )");
	
	// info for legend
	var colorHash = [JSON.parse('{"string":"Erg tevreden met het leven", "color":"#2b8cbe"}'), 
					JSON.parse('{"string":"Niet tevreden met het leven", "color":"#ece7f2"}')]

	// create legend
	var legend = svg.append("g")
		.attr("x", width - margin.right)
		.attr("y", 25)
		.attr("height", 100)
		.attr("width",100);

	// draw legend
	legend.selectAll("g").data(colorHash)
		.enter()
		.append('g')
		.each(function(d,i){
			var g = d3.select(this);
			  	g.append("rect")
			  		.attr("x", width - margin.right - 170)
			  		.attr("y", height- i * 25 - 10)
			  		.attr("width", 10)
			  		.attr("height",10)
			  		.style("fill",colorHash[i].color);
				g.append("text")
					.attr("x", width - margin.right - 155)
					.attr("y", height - i * 25)
					.attr("height", 30)
					.attr("width", 100)
					.style("fill",colorHash[i].color)
					.text(colorHash[i].string);
			});
		
	// adds title to the graph
	var title = svg.append("text")
		.attr("x", width / 2)
		.attr("y", - margin.top / 2)
		.text("Werkeloosheid schept vrijetijd?")
		.style("text-anchor", "middle")
		.style("font-size", "25px");

	// adds label to X-axis 
	var xLabel = svg.append("text")
		.attr("x", width / 2)
		.attr("y", height + margin.bottom * 0.75)
		.text("Percentage werkeloos")
		.style("text-anchor", "middle")
		.style("font-size", "15px");

	// adds label to Y-axis
	var yLabel = svg.append("text")
		.attr("transform", "rotate(-90)")
		.attr("x", 0 - height /2)
		.attr("y", 0 - margin.left)
		.text("Uren per week besteed aan vrije tijd en persoonlijke verzorging")
		.attr("dy", "1em")
		.style("text-anchor", "middle")
		.style("font-size", "15px")
		.attr("transform", "rotate(-90)");
};

/*
* Changes the scatter plot for the user input.
*/
function selectData(dropDown){
	genderSelection = dropDown

	// remove and reload new plot
	var svg = d3.select("svg")
		.remove(makePlot(dataList, genderSelection))
};


